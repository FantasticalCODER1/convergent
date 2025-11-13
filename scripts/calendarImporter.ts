/**
 * Calendar importer for Firestore events.
 *
 * Instructions:
 * 1. Place your source files at data/activities_guess.csv and data/activities_guess.json.
 * 2. Export GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT (JSON string) for a Firebase service account.
 * 3. Run: npx ts-node scripts/calendarImporter.ts
 *
 * The script reads the CSV, fills missing fields with the JSON file, and upserts events by sourceId.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, applicationDefault, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

type CsvRow = Record<string, string>;
type JsonFallback = Record<string, any>;

const CSV_PATH = path.resolve(process.cwd(), 'data/activities_guess.csv');
const JSON_PATH = path.resolve(process.cwd(), 'data/activities_guess.json');

const REQUIRED_FIELDS = ['title', 'startTime', 'endTime'];

function parseCsv(text: string): CsvRow[] {
  const [headerLine, ...lineRest] = text.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(headerLine);
  return lineRest
    .filter(Boolean)
    .map((line) => {
      const cells = splitCsvLine(line);
      const row: CsvRow = {};
      headers.forEach((key, idx) => {
        row[key] = cells[idx] ?? '';
      });
      return row;
    });
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === ',') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeDate(date?: string, time?: string) {
  if (!date && !time) return null;
  const datePart = date ?? new Date().toISOString().split('T')[0];
  const timePart = time ?? '09:00';
  return new Date(`${datePart}T${timePart}`);
}

function extract(row: CsvRow, fallback: JsonFallback, keys: string[], defaultValue?: string) {
  for (const key of keys) {
    if (row[key]?.trim()) return row[key].trim();
    if (fallback[key]?.trim) return String(fallback[key]).trim();
  }
  return defaultValue;
}

function toEventPayload(row: CsvRow, fallback: JsonFallback) {
  const date = extract(row, fallback, ['date', 'day']);
  const start = extract(row, fallback, ['start', 'start_time', 'startTime']);
  const end = extract(row, fallback, ['end', 'end_time', 'endTime'], start);

  const startDate = normalizeDate(date, start) ?? new Date();
  const endDate = normalizeDate(date, end) ?? startDate;

  const title = extract(row, fallback, ['title', 'name', 'activity'], 'Untitled activity');
  const description = extract(row, fallback, ['description', 'details']);
  const location = extract(row, fallback, ['location', 'venue']);
  const typeRaw = extract(row, fallback, ['type', 'category'], 'club')?.toLowerCase();
  const type = ['club', 'school', 'competition'].includes(typeRaw ?? '') ? typeRaw : 'club';
  const sourceId =
    extract(row, fallback, ['id', 'event_id', 'slug']) ??
    `${title}-${startDate.toISOString()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    title,
    description: description || undefined,
    location: location || undefined,
    type,
    startTime: startDate,
    endTime: endDate,
    clubId: fallback?.clubId ? String(fallback.clubId) : undefined,
    sourceId,
    source: 'csv-importer'
  };
}

async function bootstrapFirestore() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const parsed: ServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(parsed) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

async function findEventBySourceId(db: FirebaseFirestore.Firestore, sourceId: string) {
  const snap = await db.collection('events').where('sourceId', '==', sourceId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, data: snap.docs[0].data() };
}

async function upsertEvent(db: FirebaseFirestore.Firestore, payload: ReturnType<typeof toEventPayload>) {
  const existing = await findEventBySourceId(db, payload.sourceId);
  if (existing) {
    await db.collection('events').doc(existing.id).update({
      title: payload.title,
      description: payload.description ?? null,
      location: payload.location ?? null,
      type: payload.type,
      clubId: payload.clubId ?? null,
      startTime: Timestamp.fromDate(payload.startTime),
      endTime: Timestamp.fromDate(payload.endTime),
      source: payload.source,
      updatedAt: FieldValue.serverTimestamp()
    });
    return { id: existing.id, status: 'updated' as const };
  }
  const ref = await db.collection('events').add({
    title: payload.title,
    description: payload.description ?? null,
    location: payload.location ?? null,
    type: payload.type,
    clubId: payload.clubId ?? null,
    startTime: Timestamp.fromDate(payload.startTime),
    endTime: Timestamp.fromDate(payload.endTime),
    source: payload.source,
    sourceId: payload.sourceId,
    rsvpCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return { id: ref.id, status: 'created' as const };
}

async function readJson(): Promise<JsonFallback[]> {
  try {
    const raw = await readFile(JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function main() {
  console.log('[importer] Starting calendar sync');
  const [csvRaw, jsonFallbacks] = await Promise.all([readFile(CSV_PATH, 'utf-8'), readJson()]);
  const csvRows = parseCsv(csvRaw);
  const fallbackMap = new Map<string, JsonFallback>();
  jsonFallbacks.forEach((entry) => {
    if (entry?.id) fallbackMap.set(String(entry.id), entry);
  });

  const events = csvRows.map((row) => {
    const fallback = fallbackMap.get(row.id) ?? jsonFallbacks.find((entry) => entry.title === row.title) ?? {};
    return toEventPayload(row, fallback);
  });

  events.forEach((event) => {
    for (const field of REQUIRED_FIELDS) {
      if (!event[field as keyof typeof event]) {
        throw new Error(`Missing ${field} for sourceId ${event.sourceId}`);
      }
    }
  });

  const db = await bootstrapFirestore();
  let created = 0;
  let updated = 0;
  for (const event of events) {
    const result = await upsertEvent(db, event);
    if (result.status === 'created') created += 1;
    else updated += 1;
  }
  console.log(`[importer] Completed. Created ${created}, updated ${updated}.`);
}

main().catch((err) => {
  console.error('[importer] Failed:', err);
  process.exit(1);
});

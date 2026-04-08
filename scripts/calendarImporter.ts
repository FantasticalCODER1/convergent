/**
 * Calendar importer dry-run helper.
 *
 * Instructions:
 * 1. Place your source files at data/activities_guess.csv and optionally data/activities_guess.json.
 * 2. Run: npx ts-node scripts/calendarImporter.ts <clubId>
 *
 * This script no longer writes to Firestore. It normalizes the import payload,
 * prints a concise summary, and emits the JSON payload shape that the privileged
 * `applyEventImport` Function accepts.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CsvRow = Record<string, string>;
type JsonFallback = Record<string, any>;

const CSV_PATH = path.resolve(process.cwd(), 'data/activities_guess.csv');
const JSON_PATH = path.resolve(process.cwd(), 'data/activities_guess.json');

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

function parseCsv(text: string): CsvRow[] {
  const [headerLine, ...lineRest] = text.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(headerLine);
  return lineRest.map((line) => {
    const cells = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((key, idx) => {
      row[key] = cells[idx] ?? '';
    });
    return row;
  });
}

function normalizeDate(date?: string, time?: string) {
  if (!date && !time) return null;
  if (date && time) return new Date(`${date}T${time}`).toISOString();
  if (date) return new Date(`${date}T09:00`).toISOString();
  const today = new Date().toISOString().split('T')[0];
  return new Date(`${today}T${time ?? '09:00'}`).toISOString();
}

function extract(row: CsvRow, fallback: JsonFallback, keys: string[], defaultValue?: string) {
  for (const key of keys) {
    if (row[key]?.trim()) return row[key].trim();
    if (fallback[key]?.trim) return String(fallback[key]).trim();
  }
  return defaultValue;
}

function toEventPayload(row: CsvRow, fallback: JsonFallback, clubId: string) {
  const date = extract(row, fallback, ['date', 'day']);
  const start = extract(row, fallback, ['start', 'start_time', 'startTime']);
  const end = extract(row, fallback, ['end', 'end_time', 'endTime'], start);

  const startTime = normalizeDate(date, start) ?? new Date().toISOString();
  const endTime = normalizeDate(date, end) ?? startTime;

  const title = extract(row, fallback, ['title', 'name', 'activity'], 'Untitled activity');
  const description = extract(row, fallback, ['description', 'details']);
  const location = extract(row, fallback, ['location', 'venue']);
  const typeRaw = extract(row, fallback, ['type', 'category'], 'club')?.toLowerCase();
  const type = typeRaw === 'competition' ? 'competition' : 'club';
  const sourceId =
    extract(row, fallback, ['id', 'event_id', 'slug']) ??
    `${clubId}-${title}-${startTime}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    title,
    description: description || undefined,
    location: location || undefined,
    type,
    startTime,
    endTime,
    clubId,
    sourceId,
    source: 'admin-importer'
  };
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
  const clubId = process.argv[2];
  if (!clubId) {
    throw new Error('Usage: npx ts-node scripts/calendarImporter.ts <clubId>');
  }

  const [csvRaw, jsonFallbacks] = await Promise.all([readFile(CSV_PATH, 'utf-8'), readJson()]);
  const csvRows = parseCsv(csvRaw);
  const fallbackMap = new Map<string, JsonFallback>();
  jsonFallbacks.forEach((entry) => {
    if (entry?.id) fallbackMap.set(String(entry.id), entry);
  });

  const events = csvRows.map((row) => {
    const fallback = fallbackMap.get(row.id) ?? jsonFallbacks.find((entry) => entry.title === row.title) ?? {};
    return toEventPayload(row, fallback, clubId);
  });

  const invalid = events.filter((event) => !event.title || !event.startTime || !event.endTime || !event.sourceId);
  const summary = {
    clubId,
    total: events.length,
    invalid: invalid.length,
    sample: events.slice(0, 5)
  };

  console.log(JSON.stringify(summary, null, 2));
  if (invalid.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[importer] Failed:', err);
  process.exit(1);
});

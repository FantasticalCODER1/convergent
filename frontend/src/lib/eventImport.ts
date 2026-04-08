import type { ImportedEventPayload } from '../services/eventsService';

export type JsonFallback = Record<string, any>;

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === ',') {
      row.push(current.trim());
      current = '';
      continue;
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (current || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
      }
      current = '';
      row = [];
      continue;
    }
    current += char;
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

export function normalizeDate(date: string | undefined, time: string | undefined) {
  if (!date && !time) return null;
  if (date && time) return new Date(`${date}T${time}`).toISOString();
  if (date) return new Date(`${date}T09:00`).toISOString();
  const today = new Date();
  const fallbackDate = today.toISOString().split('T')[0];
  return new Date(`${fallbackDate}T${time ?? '09:00'}`).toISOString();
}

export function extractField(row: Record<string, string>, keys: string[], fallback?: string) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return fallback;
}

export function mapImportedRow(row: Record<string, string>, fallback: JsonFallback, clubId: string): ImportedEventPayload {
  const date = extractField(row, ['date', 'day'], fallback?.date);
  const startTime = extractField(row, ['start', 'start_time', 'startTime'], fallback?.start);
  const endTime = extractField(row, ['end', 'end_time', 'endTime'], fallback?.end ?? startTime);

  const startIso = normalizeDate(date, startTime) ?? new Date().toISOString();
  const endIso = normalizeDate(date, endTime) ?? startIso;

  const title = extractField(row, ['title', 'name', 'activity'], fallback?.title) ?? 'Untitled activity';
  const description = extractField(row, ['description', 'details'], fallback?.description);
  const location = extractField(row, ['location', 'venue'], fallback?.location);
  const type = (extractField(row, ['type', 'category'], fallback?.type) ?? 'club').toLowerCase();

  const sourceId =
    extractField(row, ['id', 'event_id', 'slug'], fallback?.id) ??
    `${clubId}-${title}-${startIso}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    title,
    description: description ?? undefined,
    location: location ?? undefined,
    type: type === 'competition' ? 'competition' : 'club',
    startTime: startIso,
    endTime: endIso,
    clubId,
    sourceId,
    source: 'admin-importer'
  };
}

export function buildImportedEvents(csvText: string, jsonText: string | undefined, clubId: string) {
  const csvRows = parseCsv(csvText.trim());
  const headers = csvRows.shift() ?? [];
  const fallbackRecords: JsonFallback[] = JSON.parse(jsonText || '[]');
  const fallbackMap = new Map<string, JsonFallback>();
  fallbackRecords.forEach((entry) => {
    if (entry?.id) fallbackMap.set(String(entry.id), entry);
  });

  return csvRows.map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    const fallback = fallbackMap.get(row.id) ?? fallbackRecords.find((entry) => entry.title === row.title) ?? {};
    return mapImportedRow(row, fallback, clubId);
  });
}

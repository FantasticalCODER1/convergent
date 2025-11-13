import { useState } from 'react';
import type { ImportedEventPayload } from '../../services/eventsService';
import { useEvents } from '../../hooks/useEvents';

type JsonFallback = Record<string, any>;

function parseCsv(text: string) {
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

function normalizeDate(date: string | undefined, time: string | undefined) {
  if (!date && !time) return null;
  if (date && time) return new Date(`${date}T${time}`).toISOString();
  if (date) return new Date(`${date}T09:00`).toISOString();
  const today = new Date();
  const fallbackDate = today.toISOString().split('T')[0];
  return new Date(`${fallbackDate}T${time ?? '09:00'}`).toISOString();
}

function extractField(row: Record<string, string>, keys: string[], fallback?: string) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return fallback;
}

function mapRow(row: Record<string, string>, fallback: JsonFallback): ImportedEventPayload {
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
    `${title}-${startIso}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    title,
    description: description ?? undefined,
    location: location ?? undefined,
    type: type === 'school' || type === 'competition' ? (type as any) : 'club',
    startTime: startIso,
    endTime: endIso,
    clubId: fallback?.clubId ?? undefined,
    sourceId,
    source: 'admin-importer'
  };
}

async function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = (event) => reject(event instanceof Error ? event : new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function CalendarImporter() {
  const { importEvents } = useEvents({ autoLoad: false });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isRunning, setRunning] = useState(false);

  const runImport = async () => {
    if (!csvFile) {
      setStatus('Select activities_guess.csv first.');
      return;
    }
    setRunning(true);
    setStatus('Parsing files…');
    try {
      const csvText = await readFile(csvFile);
      const jsonText = jsonFile ? await readFile(jsonFile) : '[]';
      const csvRows = parseCsv(csvText.trim());
      const headers = csvRows.shift() ?? [];
      const fallbackRecords: JsonFallback[] = JSON.parse(jsonText || '[]');
      const fallbackMap = new Map<string, JsonFallback>();
      fallbackRecords.forEach((entry) => {
        if (entry?.id) fallbackMap.set(String(entry.id), entry);
      });

      const payloads: ImportedEventPayload[] = csvRows.map((cells) => {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = cells[index] ?? '';
        });
        const fallback = fallbackMap.get(row.id) ?? fallbackRecords.find((entry) => entry.title === row.title) ?? {};
        return mapRow(row, fallback);
      });

      await importEvents(payloads);
      setStatus(`Imported ${payloads.length} events.`);
    } catch (err: any) {
      setStatus(err?.message ?? 'Import failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-amber-400/40 bg-amber-50/5 p-4 text-white">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Calendar importer</p>
        <p className="text-sm text-white/70">Mirror data/activities_guess.csv (+ optional JSON) into Firestore.</p>
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-white/70">activities_guess.csv</span>
        <input type="file" accept=".csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-white/70">activities_guess.json (optional gaps file)</span>
        <input type="file" accept=".json" onChange={(event) => setJsonFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <button type="button" onClick={runImport} disabled={isRunning} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-60">
        {isRunning ? 'Importing…' : 'Import events'}
      </button>
      <p className="text-xs text-white/60">
        Tip: For bulk automation run <code>scripts/calendarImporter.ts</code> which uses the same schema but talks directly to Firestore through the Admin SDK.
      </p>
      {status && <p className="text-xs text-white/70">{status}</p>}
    </div>
  );
}

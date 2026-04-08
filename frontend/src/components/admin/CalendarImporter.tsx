import { useMemo, useState } from 'react';
import type { ImportedEventPayload } from '../../services/eventsService';
import { useEvents } from '../../hooks/useEvents';
import { buildImportedEvents } from '../../lib/eventImport';

type Props = {
  clubId: string;
  onImported?: () => Promise<void> | void;
};

async function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = (event) => reject(event instanceof Error ? event : new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function CalendarImporter({ clubId, onImported }: Props) {
  const { importEvents } = useEvents({ autoLoad: false });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportedEventPayload[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isParsing, setParsing] = useState(false);
  const [isApplying, setApplying] = useState(false);

  const hasPreview = preview.length > 0;
  const previewLabel = useMemo(() => {
    if (!hasPreview) return 'No preview generated yet.';
    return `${preview.length} normalized event${preview.length === 1 ? '' : 's'} ready to apply.`;
  }, [hasPreview, preview.length]);

  const buildPreview = async () => {
    if (!csvFile) {
      setStatus('Select activities_guess.csv first.');
      return;
    }
    setParsing(true);
    setStatus('Parsing files…');
    try {
      const csvText = await readFile(csvFile);
      const jsonText = jsonFile ? await readFile(jsonFile) : '[]';
      const payloads = buildImportedEvents(csvText, jsonText, clubId);
      setPreview(payloads);
      setStatus(`Preview ready. ${payloads.length} event${payloads.length === 1 ? '' : 's'} normalized.`);
    } catch (err: any) {
      setPreview([]);
      setStatus(err?.message ?? 'Preview failed.');
    } finally {
      setParsing(false);
    }
  };

  const applyPreview = async () => {
    if (!hasPreview) {
      setStatus('Build a preview first.');
      return;
    }
    setApplying(true);
    setStatus('Applying import…');
    try {
      const result = await importEvents(preview);
      const errorSuffix = result.errors.length > 0 ? ` ${result.errors.length} row(s) were skipped.` : '';
      setStatus(`Applied import. Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}.${errorSuffix}`);
      await onImported?.();
    } catch (err: any) {
      setStatus(err?.message ?? 'Import failed.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-amber-400/40 bg-amber-50/5 p-4 text-white">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Calendar importer</p>
        <p className="text-sm text-white/70">Preview CSV/JSON imports locally, then apply the normalized rows through the privileged import function.</p>
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-white/70">activities_guess.csv</span>
        <input type="file" accept=".csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-white/70">activities_guess.json (optional gaps file)</span>
        <input type="file" accept=".json" onChange={(event) => setJsonFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={buildPreview}
          disabled={isParsing || isApplying}
          className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-60"
        >
          {isParsing ? 'Parsing…' : 'Build preview'}
        </button>
        <button
          type="button"
          onClick={applyPreview}
          disabled={!hasPreview || isApplying || isParsing}
          className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-60"
        >
          {isApplying ? 'Applying…' : 'Apply import'}
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-xs text-white/70">
        <p>{previewLabel}</p>
        {preview.slice(0, 5).map((event) => (
          <div key={event.sourceId} className="mt-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <p className="font-medium text-white">{event.title}</p>
            <p>{new Date(event.startTime).toLocaleString()} · {event.type}</p>
            <p className="text-white/50">{event.sourceId}</p>
          </div>
        ))}
        {preview.length > 5 ? <p className="mt-2 text-white/50">Showing the first 5 rows.</p> : null}
      </div>
      <p className="text-xs text-white/60">
        The companion script <code>scripts/calendarImporter.ts</code> now performs a dry-run normalization summary only. Firestore writes happen through the import function.
      </p>
      {status && <p className="text-xs text-white/70">{status}</p>}
    </div>
  );
}

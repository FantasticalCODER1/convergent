type Props = {
  clubId: string;
  onImported?: () => Promise<void> | void;
};

export function CalendarImporter({ clubId }: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-amber-400/40 bg-amber-50/5 p-4 text-white">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Calendar datasets</p>
        <p className="text-sm text-white/70">
          School calendar ingestion is now server-side. Dataset files live under <code>data/calendar/datasets/</code> and are imported with <code>npm run calendar:import</code>.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-xs text-white/70">
        <p>Club context: <code>{clubId}</code></p>
        <p className="mt-2">Active datasets are registered in <code>data/calendar/datasetsRegistry.json</code>.</p>
        <p className="mt-2">Dry run: <code>npm run calendar:import -- --dry-run</code></p>
        <p className="mt-2">Import one dataset: <code>npm run calendar:import -- --dataset &lt;dataset-id&gt;</code></p>
      </div>
      <p className="text-xs text-white/60">
        Raw OCR and JSON files are not parsed in the client anymore. See <code>docs/calendar-import.md</code> for the full workflow.
      </p>
    </div>
  );
}

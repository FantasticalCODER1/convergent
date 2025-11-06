/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Placeholder certificate template preview component for real-time personalization.
// TODO: Replace with dynamic template selection and signature overlays.

export default function CertificateTemplate({ studentName, clubName, eventName, date }) {
  return (
    <div className="rounded-3xl border border-dashed border-brand/40 bg-white/95 p-6 text-center shadow-soft">
      <h2 className="text-2xl font-semibold text-accent">Certificate Preview</h2>
      <p className="mt-4 text-sm text-slate-500">This certifies that</p>
      <p className="mt-2 text-xl font-semibold text-brand">{studentName || 'Student Name'}</p>
      <p className="mt-4 text-sm text-slate-500">has successfully participated in</p>
      <p className="mt-2 text-lg font-medium text-slate-700">{eventName || 'Event Name'}</p>
      <p className="mt-1 text-sm text-slate-500">organized by {clubName || 'Club Name'}</p>
      <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Issued on {date || 'Date'}</p>
    </div>
  );
}

/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Simple event card component used across the dashboard and calendar listings.
// TODO: Enable RSVP state toggles and attendance insights per event.

export default function EventCard({ title, date, location, description }) {
  return (
    <article className="shadow-soft duration-250 rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <span className="text-accent text-xs font-semibold uppercase tracking-wide">{date}</span>
      </header>
      <p className="text-sm text-slate-600">{description}</p>
      {location && <p className="mt-3 text-xs text-slate-400">📍 {location}</p>}
    </article>
  );
}

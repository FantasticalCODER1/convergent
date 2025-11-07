/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Unified calendar view placeholder for aggregating school-wide activities.
// TODO: Embed interactive timeline, ICS exports, and mobile-friendly agenda mode.

export default function CalendarPage() {
  const filters = ['All', 'Clubs', 'School Events', 'Competitions'];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-accent">Calendar</h2>
          <p className="text-sm text-slate-500">
            Track upcoming meetings, events, and competitions across the school.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              className="rounded-full border border-brand/30 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition duration-250 hover:bg-brand/10 hover:text-accent"
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 text-center text-sm text-slate-500 shadow-soft">
        A dynamic calendar visualization will appear here, syncing automatically with club events and school-wide activities.
      </div>
    </div>
  );
}

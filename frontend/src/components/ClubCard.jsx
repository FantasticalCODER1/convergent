/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Reusable club card component for the clubs listing page with hover affordances.
// TODO: Display live metrics (hours logged, certificates) for data-driven discovery.

import { Link } from 'react-router-dom';

export default function ClubCard({ id, name, logoUrl, frequency, masterInCharge }) {
  return (
    <div className="shadow-soft duration-250 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="size-12 rounded-full object-cover shadow" />
        ) : (
          <div className="bg-brand/15 text-accent flex size-12 items-center justify-center rounded-full">
            {name?.charAt(0) ?? '?'}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{name}</h3>
          <p className="text-xs font-medium text-slate-500">{frequency}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">Master-in-Charge: {masterInCharge}</p>
        <Link
          to={`/clubs/${id}`}
          className="bg-brand shadow-soft hover:bg-brand-dark rounded-full px-3 py-1 text-xs font-semibold text-white"
        >
          View
        </Link>
      </div>
    </div>
  );
}

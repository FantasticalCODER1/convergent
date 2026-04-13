import { UsersRound } from 'lucide-react';
import { formatRelativeEventWindow } from '../lib/formatters';
import type { EventRecord } from '../types/Event';
import type { Club } from '../types/Club';

type Props = {
  club: Club;
  joined?: boolean;
  manageable?: boolean;
  nextEvent?: EventRecord;
  onJoin?: (clubId: string) => Promise<void> | void;
  onLeave?: (clubId: string) => Promise<void> | void;
  onOpen?: (club: Club) => void;
};

export function ClubCard({ club, joined, manageable, nextEvent, onJoin, onLeave, onOpen }: Props) {
  const handleAction = () => {
    if (joined) {
      onLeave?.(club.id);
    } else {
      onJoin?.(club.id);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{club.category}</p>
          <h3 className="text-xl font-semibold">{club.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/70">
          <UsersRound className="size-4" />
          {club.memberCount}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {manageable ? <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-emerald-100">Managing</span> : null}
        {joined ? <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-indigo-100">Member</span> : null}
        {!joined && !manageable ? <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/60">Open to join</span> : null}
      </div>
      <p className="mt-3 min-h-12 text-sm leading-6 text-white/70">{club.description || 'Club description pending.'}</p>
      <div className="mt-4 space-y-2 text-sm text-white/65">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
          <span>MIC</span>
          <span className="text-right text-white">{club.mic}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
          <span>Schedule</span>
          <span className="text-right text-white">{club.schedule}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
          <span>Next event</span>
          <span className="text-right text-white">{nextEvent ? formatRelativeEventWindow(nextEvent.startTime, nextEvent.endTime) : 'None scheduled'}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(club)}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Open club
          </button>
        )}
        {(onJoin || onLeave) && (
          <button
            type="button"
            onClick={handleAction}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              joined ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            {joined ? 'Leave club' : 'Join club'}
          </button>
        )}
      </div>
    </div>
  );
}

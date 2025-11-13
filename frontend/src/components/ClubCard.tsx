import { UsersRound } from 'lucide-react';
import type { Club } from '../types/Club';

type Props = {
  club: Club;
  joined?: boolean;
  onJoin?: (clubId: string) => Promise<void> | void;
  onLeave?: (clubId: string) => Promise<void> | void;
  onOpen?: (club: Club) => void;
};

export function ClubCard({ club, joined, onJoin, onLeave, onOpen }: Props) {
  const handleAction = () => {
    if (joined) {
      onLeave?.(club.id);
    } else {
      onJoin?.(club.id);
    }
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-5 text-white shadow-glass">
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
      <p className="mt-3 text-sm text-white/70">{club.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
        <span className="rounded-full border border-white/10 px-3 py-1">MIC · {club.mic}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">{club.schedule}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(club)}
            className="rounded-2xl border border-white/10 px-4 py-1 text-sm text-white/80 transition hover:bg-white/10"
          >
            Open
          </button>
        )}
        {(onJoin || onLeave) && (
          <button
            type="button"
            onClick={handleAction}
            className={`rounded-2xl px-4 py-1 text-sm font-medium transition ${
              joined ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            {joined ? 'Leave' : 'Join'}
          </button>
        )}
      </div>
    </div>
  );
}

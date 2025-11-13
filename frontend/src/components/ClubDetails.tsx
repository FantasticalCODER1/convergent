import type { Club } from '../types/Club';

type Props = {
  club: Club;
  joined?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  children?: React.ReactNode;
};

export function ClubDetails({ club, joined, onJoin, onLeave, children }: Props) {
  const action = () => {
    if (joined) onLeave?.();
    else onJoin?.();
  };

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{club.category}</p>
          <h1 className="text-3xl font-semibold">{club.name}</h1>
          <p className="mt-2 text-white/70">{club.description}</p>
        </div>
        {(onJoin || onLeave) && (
          <button
            type="button"
            onClick={action}
            className={`rounded-2xl px-5 py-2 text-sm font-medium transition ${
              joined ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            {joined ? 'Leave club' : 'Join club'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-white/60">
        <span className="rounded-full border border-white/10 px-3 py-1">MIC · {club.mic}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">{club.schedule}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">{club.memberCount} members</span>
      </div>
      {children}
    </section>
  );
}

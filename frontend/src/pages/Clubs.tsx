import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ClubCard } from '../components/ClubCard';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';

export default function Clubs() {
  const { user } = useAuth();
  const { clubs, loading, joinClub, leaveClub } = useClubs();

  const membership = useMemo(() => new Set(user?.clubsJoined ?? []), [user?.clubsJoined]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Communities</p>
          <h1 className="text-3xl font-semibold text-white">Clubs & Societies</h1>
          <p className="text-white/60">Discover, join, and manage vibrant student communities.</p>
        </div>
        {user?.role === 'admin' ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            Create new clubs from the admin panel.
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">Loading clubs…</div>
      ) : clubs.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">
          No clubs yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club, index) => (
            <motion.div key={club.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <ClubCard club={club} joined={membership.has(club.id)} onJoin={(id) => joinClub(id)} onLeave={(id) => leaveClub(id)} />
              <Link to={`/clubs/${club.id}`} className="mt-2 block text-sm text-indigo-300 hover:text-indigo-100">
                View timeline →
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

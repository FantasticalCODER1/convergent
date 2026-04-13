import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClubCard } from '../components/ClubCard';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { canManageClub } from '../lib/policy';

export default function Clubs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubs, loading, error, joinClub, leaveClub } = useClubs();
  const { events } = useEvents();

  const membership = useMemo(() => new Set(user?.clubsJoined ?? []), [user?.clubsJoined]);
  const managedClubIds = useMemo(
    () => new Set(clubs.filter((club) => canManageClub(user, club)).map((club) => club.id)),
    [clubs, user]
  );
  const nextEventsByClubId = useMemo(() => {
    const nextEvents = new Map<string, (typeof events)[number]>();
    events
      .filter((event) => event.clubId && new Date(event.startTime).getTime() >= Date.now())
      .forEach((event) => {
        const clubId = event.clubId as string;
        const existing = nextEvents.get(clubId);
        if (!existing || new Date(event.startTime).getTime() < new Date(existing.startTime).getTime()) {
          nextEvents.set(clubId, event);
        }
      });
    return nextEvents;
  }, [events]);

  const joinedCount = clubs.filter((club) => membership.has(club.id)).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Communities</p>
          <h1 className="text-3xl font-semibold text-white">Clubs & Societies</h1>
          <p className="text-white/60">Discover, join, and open the club workspace that now anchors events, members, posts, and certificates.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="All clubs" value={String(clubs.length)} hint="Current directory" />
          <StatCard label="Joined" value={String(joinedCount)} hint="On your profile" />
          <StatCard label="Managing" value={String(managedClubIds.size)} hint="Club-scoped access" />
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">Loading clubs…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-300/20 bg-rose-500/5 p-6 text-rose-100 shadow-glass">{error}</div>
      ) : clubs.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">
          No clubs yet.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {clubs.map((club, index) => (
            <motion.div key={club.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <ClubCard
                club={club}
                joined={membership.has(club.id)}
                manageable={managedClubIds.has(club.id)}
                nextEvent={nextEventsByClubId.get(club.id)}
                onJoin={(id) => joinClub(id)}
                onLeave={(id) => leaveClub(id)}
                onOpen={(targetClub) => navigate(`/clubs/${targetClub.id}`)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-glass">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/50">{hint}</p>
    </div>
  );
}

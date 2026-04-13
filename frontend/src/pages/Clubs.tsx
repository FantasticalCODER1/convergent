import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { ClubCard } from '../components/ClubCard';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { canManageClub } from '../lib/policy';

export default function Clubs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubs, loading, error, joinClub, leaveClub, membershipMap } = useClubs();
  const { events } = useEvents();

  const membership = useMemo(() => new Set(user?.clubsJoined ?? []), [user?.clubsJoined]);
  const managedClubIds = useMemo(
    () => new Set(clubs.filter((club) => canManageClub(user, club)).map((club) => club.id)),
    [clubs, user]
  );
  const nextEventsByClubId = useMemo(() => {
    const nextEvents = new Map<string, (typeof events)[number]>();
    events
      .filter((event) => (event.relatedGroupId || event.clubId) && new Date(event.startTime).getTime() >= Date.now())
      .forEach((event) => {
        const clubId = (event.relatedGroupId ?? event.clubId) as string;
        const existing = nextEvents.get(clubId);
        if (!existing || new Date(event.startTime).getTime() < new Date(existing.startTime).getTime()) {
          nextEvents.set(clubId, event);
        }
      });
    return nextEvents;
  }, [events]);

  const joinedCount = clubs.filter((club) => membership.has(club.id) || membershipMap[club.id]?.status === 'approved').length;
  const openJoinableClubs = clubs.filter((club) => club.membershipMode !== 'invite_only');

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Communities</p>
          <h1 className="text-3xl font-semibold text-white">Join Clubs</h1>
          <p className="text-white/60">Browse the current group directory, see which spaces are open, and add them to your Convergent membership profile.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="All clubs" value={String(clubs.length)} hint="Current directory" />
          <StatCard label="Open joins" value={String(openJoinableClubs.length)} hint="No approval flow needed yet" />
          <StatCard label="Joined" value={String(joinedCount)} hint="On your profile" />
          <StatCard label="Managing" value={String(managedClubIds.size)} hint="Club-scoped access" />
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Discovery</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Choose the spaces you want on your profile</h2>
            </div>
            <Link to="/my-clubs" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
              Open My Clubs
            </Link>
          </div>
          <p className="mt-3 text-sm text-white/65">
            Membership approvals are modelled in the data layer now, but this build keeps most groups self-serve until manager workflows are added.
          </p>
        </div>
        <EmptyStateCard
          eyebrow="Metadata"
          title="Group metadata is foundation-first"
          body="Classroom links, Meet rooms, richer group descriptors, and approval rules can now be attached per group. Where live data is missing, the UI stays explicit instead of faking details."
          tone="accent"
        />
      </section>

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
                joined={membership.has(club.id) || membershipMap[club.id]?.status === 'approved'}
                manageable={managedClubIds.has(club.id)}
                nextEvent={nextEventsByClubId.get(club.id)}
                onJoin={(id) => joinClub(id)}
                onLeave={(id) => leaveClub(id)}
                onOpen={(targetClub) => navigate(`/my-clubs/${targetClub.id}`)}
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

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { ClubCard } from '../components/ClubCard';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { canManageClub } from '../lib/policy';

export default function MyClubs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubs, loading, error, membershipMap, leaveClub } = useClubs();
  const { events } = useEvents();

  const mine = useMemo(() => {
    return clubs.filter((club) => {
      const membership = membershipMap[club.id];
      return (
        membership?.status === 'approved' ||
        (user?.clubsJoined ?? []).includes(club.id) ||
        canManageClub(user, club)
      );
    });
  }, [clubs, membershipMap, user]);

  const nextEventsByClubId = useMemo(() => {
    const nextEvents = new Map<string, (typeof events)[number]>();
    events
      .filter((event) => event.relatedGroupId && new Date(event.startTime).getTime() >= Date.now())
      .forEach((event) => {
        const groupId = event.relatedGroupId as string;
        const existing = nextEvents.get(groupId);
        if (!existing || new Date(event.startTime).getTime() < new Date(existing.startTime).getTime()) {
          nextEvents.set(groupId, event);
        }
      });
    return nextEvents;
  }, [events]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Ownership</p>
          <h1 className="text-3xl font-semibold text-white">My Clubs</h1>
          <p className="text-white/60">This is your personal operating surface for approved memberships, managed groups, and the detail pages that anchor posts, events, and certificates.</p>
        </div>
        <Link to="/join-clubs" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
          Browse all groups
        </Link>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 shadow-glass">Loading memberships…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-300/20 bg-rose-500/5 p-6 text-rose-100 shadow-glass">{error}</div>
      ) : mine.length === 0 ? (
        <EmptyStateCard
          eyebrow="My Clubs"
          title="No approved memberships yet"
          body="Your personal club workspace will populate here after you join a group. The directory is separate now so discovery and ownership stay distinct."
          actionLabel="Open Join Clubs"
          onAction={() => navigate('/join-clubs')}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {mine.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              joined={(user?.clubsJoined ?? []).includes(club.id) || membershipMap[club.id]?.status === 'approved'}
              manageable={canManageClub(user, club)}
              nextEvent={nextEventsByClubId.get(club.id)}
              onLeave={(id) => leaveClub(id)}
              onOpen={(targetClub) => navigate(`/my-clubs/${targetClub.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { addDays } from 'date-fns';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { ClubCard } from '../components/ClubCard';
import { getClubAccessState } from '../domain/memberships';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { STUDENT_CLUB_PLACEHOLDER, shouldUseStudentClubPlaceholder } from '../lib/productTruth';

export default function MyClubs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubs, loading, error, membershipMap, leaveClub } = useClubs();
  const showStudentPlaceholder = shouldUseStudentClubPlaceholder(user);
  const eventWindow = useMemo(
    () => ({
      rangeStart: new Date(),
      rangeEnd: addDays(new Date(), 120)
    }),
    []
  );
  const { events } = useEvents(eventWindow);

  const mine = useMemo(
    () =>
      clubs.filter((club) => {
        const state = getClubAccessState(user, club, membershipMap);
        return state === 'manager' || state === 'approved_member';
      }),
    [clubs, membershipMap, user]
  );

  const pending = useMemo(
    () =>
      clubs.filter((club) => getClubAccessState(user, club, membershipMap) === 'pending_member'),
    [clubs, membershipMap, user]
  );

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

  if (showStudentPlaceholder) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Ownership</p>
          <h1 className="text-3xl font-semibold text-white">My Clubs</h1>
          <p className="mt-2 max-w-3xl text-white/60">
            Student club memberships stay in placeholder mode locally until the real directory and approval data are ready to replace the seeded fixtures.
          </p>
        </header>

        <EmptyStateCard
          eyebrow="Student clubs"
          title={STUDENT_CLUB_PLACEHOLDER.title}
          body="There are no truthful student club memberships to show yet. When the club program is live, approved clubs will appear here automatically."
          actionLabel="Back to calendar"
          onAction={() => navigate('/calendar')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Ownership</p>
          <h1 className="text-3xl font-semibold text-white">My Clubs</h1>
          <p className="mt-2 max-w-3xl text-white/60">
            This page is reserved for approved memberships and managed groups. Anything still waiting for approval remains in Join Clubs until access is granted.
          </p>
        </div>
        <Link to="/join-clubs" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
          Browse all groups
        </Link>
      </header>

      {pending.length > 0 ? (
        <section className="rounded-[32px] border border-amber-300/20 bg-amber-500/5 p-6 text-white shadow-glass">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-50/80">Pending</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Requests still waiting</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {pending.map((club) => (
              <span key={club.id} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/70">
                {club.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 shadow-glass">Loading memberships…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-300/20 bg-rose-500/5 p-6 text-rose-100 shadow-glass">{error}</div>
      ) : mine.length === 0 ? (
        <EmptyStateCard
          eyebrow="My Clubs"
          title="No approved memberships yet"
          body="Approved groups will appear here automatically and feed into your personal calendar. Discovery and pending requests remain on the Join Clubs page."
          actionLabel="Open Join Clubs"
          onAction={() => navigate('/join-clubs')}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {mine.map((club) => (
            (() => {
              const accessState = getClubAccessState(user, club, membershipMap);
              return (
                <ClubCard
                  key={club.id}
                  club={club}
                  joined={accessState === 'approved_member'}
                  membershipState={accessState}
                  manageable={accessState === 'manager'}
                  nextEvent={nextEventsByClubId.get(club.id)}
                  openLabel="Open workspace"
                  onLeave={(id) => leaveClub(id)}
                  onOpen={(targetClub) => navigate(`/my-clubs/${targetClub.id}`)}
                />
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
}

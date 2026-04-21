import { addDays } from 'date-fns';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { ClubCard } from '../components/ClubCard';
import { getClubAccessState } from '../domain/memberships';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { STUDENT_CLUB_PLACEHOLDER, shouldUseStudentClubPlaceholder } from '../lib/productTruth';

export default function Clubs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubs, loading, error, joinClub, leaveClub, membershipMap } = useClubs();
  const showStudentPlaceholder = shouldUseStudentClubPlaceholder(user);
  const eventWindow = useMemo(
    () => ({
      rangeStart: new Date(),
      rangeEnd: addDays(new Date(), 120)
    }),
    []
  );
  const { events } = useEvents(eventWindow);

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

  const clubStates = useMemo(
    () =>
      clubs.map((club) => ({
        club,
        accessState: getClubAccessState(user, club, membershipMap)
      })),
    [clubs, membershipMap, user]
  );

  const pendingClubs = clubStates.filter((entry) => entry.accessState === 'pending_member');
  const availableClubs = clubStates.filter((entry) => entry.accessState === 'not_joined' || entry.accessState === 'rejected_member');
  const approvedClubs = clubStates.filter((entry) => entry.accessState === 'approved_member' || entry.accessState === 'manager');

  if (showStudentPlaceholder) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Communities</p>
          <h1 className="text-3xl font-semibold text-white">Join Clubs</h1>
          <p className="mt-2 max-w-3xl text-white/60">
            This surface remains in explicit placeholder mode for students until real club data replaces the development fixtures used elsewhere in the repo.
          </p>
        </header>

        <EmptyStateCard
          eyebrow="Student clubs"
          title={STUDENT_CLUB_PLACEHOLDER.title}
          body={STUDENT_CLUB_PLACEHOLDER.body}
          actionLabel="Open calendar"
          onAction={() => navigate('/calendar')}
          tone="accent"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Communities</p>
          <h1 className="text-3xl font-semibold text-white">Join Clubs</h1>
          <p className="mt-2 max-w-3xl text-white/60">
            Browse every group, request membership where approval is required, and keep discovery separate from the clubs already attached to your personal calendar.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Directory" value={String(clubs.length)} hint="Visible groups" />
          <StatCard label="Available" value={String(availableClubs.length)} hint="Open or requestable" />
          <StatCard label="Pending" value={String(pendingClubs.length)} hint="Awaiting approval" />
          <StatCard label="Approved" value={String(approvedClubs.length)} hint="Already on your calendar" />
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glass">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Discovery</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Browse available groups</h2>
            </div>
            <Link to="/my-clubs" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
              Open My Clubs
            </Link>
          </div>
          <p className="mt-3 text-sm text-white/65">
            Only school-visible clubs appear in discovery. Approved memberships feed private club links and your personal calendar, while private clubs stay unreadable until you have real access.
          </p>
        </div>
        <EmptyStateCard
          eyebrow="Visibility"
          title="Private clubs stay private"
          body="Discovery only shows clubs your account can actually read. Classroom links, Meet rooms, and members-only resources are enforced by backend access rules instead of cosmetic hiding alone."
          tone="accent"
        />
      </section>

      {pendingClubs.length > 0 ? (
        <section className="rounded-[32px] border border-amber-300/20 bg-amber-500/5 p-6 shadow-glass">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-50/80">Pending requests</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Awaiting club approval</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/60">
              {pendingClubs.length} open
            </span>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {pendingClubs.map(({ club, accessState }, index) => (
              <motion.div key={club.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <ClubCard
                  club={club}
                  membershipState={accessState}
                  nextEvent={nextEventsByClubId.get(club.id)}
                  openLabel="Open detail"
                  onLeave={(id) => leaveClub(id)}
                  onOpen={(targetClub) => navigate(`/clubs/${targetClub.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">Loading clubs…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-300/20 bg-rose-500/5 p-6 text-rose-100 shadow-glass">{error}</div>
      ) : availableClubs.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">No additional clubs are available right now.</div>
      ) : (
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Directory</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Available to join or request</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {availableClubs.map(({ club, accessState }, index) => (
              <motion.div key={club.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <ClubCard
                  club={club}
                  joined={false}
                  membershipState={accessState}
                  nextEvent={nextEventsByClubId.get(club.id)}
                  openLabel="Open detail"
                  onJoin={(id) => joinClub(id)}
                  onLeave={(id) => leaveClub(id)}
                  onOpen={(targetClub) => navigate(`/clubs/${targetClub.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </section>
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

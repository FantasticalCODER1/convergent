import { addDays } from 'date-fns';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { ClubCard } from '../components/ClubCard';
import { MetricCard, PageHeader, StatRow, SurfaceSection } from '../components/ui/product';
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
        <PageHeader
          eyebrow="Communities"
          title="Join Clubs"
          description="This surface remains in explicit placeholder mode for students until real club data replaces the development fixtures used elsewhere in the repo."
          aside={
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Directory" value="Staged" hint="Student discovery held back" tone="accent" />
              <MetricCard label="Memberships" value="0" hint="No fake access shown" />
            </div>
          }
        />

        <EmptyStateCard
          eyebrow="Student clubs"
          title={STUDENT_CLUB_PLACEHOLDER.title}
          body={STUDENT_CLUB_PLACEHOLDER.body}
          actionLabel="Open calendar"
          onAction={() => navigate('/calendar')}
          tone="accent"
        />

        <SurfaceSection
          eyebrow="Why this is limited"
          title="Discovery stays truthful"
          description="The product will only open student club discovery once the directory, approvals, and private-link behaviour are all backed by real school data instead of development fixtures."
        >
          <div className="space-y-3">
            <StatRow label="Discovery cards" value="Hidden until directory data is real" />
            <StatRow label="Approval states" value="Will appear once manager review is live" />
            <StatRow label="Calendar links" value="Only approved clubs will feed the planner" />
          </div>
        </SurfaceSection>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communities"
        title="Join Clubs"
        description="Browse every group, request membership where approval is required, and keep discovery separate from the clubs already attached to your personal calendar."
        aside={
          <div className="grid gap-3 sm:grid-cols-4">
            <MetricCard label="Directory" value={String(clubs.length)} hint="Visible groups" />
            <MetricCard label="Available" value={String(availableClubs.length)} hint="Open or requestable" />
            <MetricCard label="Pending" value={String(pendingClubs.length)} hint="Awaiting approval" tone={pendingClubs.length > 0 ? 'warning' : 'muted'} />
            <MetricCard label="Approved" value={String(approvedClubs.length)} hint="Already on your calendar" />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SurfaceSection
          eyebrow="Discovery"
          title="Browse available groups"
          description="Only school-visible clubs appear in discovery. Approved memberships feed private club links and your personal calendar, while private clubs stay unreadable until you have real access."
          action={
            <Link
              to="/my-clubs"
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
            >
              Open My Clubs
            </Link>
          }
        />

        <SurfaceSection
          eyebrow="Visibility"
          title="Private clubs stay private"
          description="Discovery only shows clubs your account can actually read. Classroom links, Meet rooms, and members-only resources are enforced by backend access rules instead of cosmetic hiding alone."
          tone="accent"
        />
      </div>

      {pendingClubs.length > 0 ? (
        <SurfaceSection eyebrow="Pending requests" title="Awaiting club approval" tone="warning">
          <div className="grid gap-4 xl:grid-cols-2">
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
        </SurfaceSection>
      ) : null}

      {loading ? (
        <SurfaceSection eyebrow="Directory" title="Loading groups">
          <div className="text-sm text-[var(--text-muted)]">Loading clubs…</div>
        </SurfaceSection>
      ) : error ? (
        <SurfaceSection eyebrow="Directory" title="Discovery unavailable" tone="warning">
          <div className="text-sm text-rose-100">{error}</div>
        </SurfaceSection>
      ) : availableClubs.length === 0 ? (
        <EmptyStateCard
          eyebrow="Directory"
          title="No additional clubs are available right now"
          body="When new school-visible groups are published, they will appear here with their true approval mode and discovery links."
        />
      ) : (
        <SurfaceSection eyebrow="Directory" title="Available to join or request">
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
        </SurfaceSection>
      )}
    </div>
  );
}

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
import { shouldUseStudentClubPlaceholder } from '../lib/productTruth';

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
          description="Browse school clubs when the directory is published."
          aside={
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricCard label="Directory" value="Pending" hint="Not published yet" tone="accent" />
              <MetricCard label="Requests" value="0" hint="No pending approvals" />
            </div>
          }
        />

        <SurfaceSection
          eyebrow="Directory"
          title="Club directory"
          action={
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[var(--paper-soft)]"
            >
              Open calendar
            </button>
          }
        >
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              disabled
              placeholder="Search clubs"
              className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm text-[var(--text-muted)]"
            />
            <select disabled className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
              <option>All clubs</option>
              <option>Open</option>
              <option>Approval required</option>
            </select>
          </div>

          <div className="ledger-table">
            <div className="ledger-header grid-cols-[minmax(0,1fr)_180px_150px_150px_120px]">
              <span>Club</span>
              <span>Master-in-Charge</span>
              <span>Meeting day</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            <div className="ledger-row grid-cols-[minmax(0,1fr)_180px_150px_150px_120px] text-sm text-[var(--text-muted)]">
              <span>Directory not published yet.</span>
              <span>-</span>
              <span>-</span>
              <span>Pending</span>
              <span>-</span>
            </div>
          </div>

          <div className="mt-4">
            <StatRow label="Private links" value="Hidden until access is approved" />
            <StatRow label="Approval states" value="Shown as rows when live" />
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
        description="Browse groups, request membership, and keep discovery separate from your workspace."
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
          action={
            <Link
              to="/my-clubs"
              className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
            >
              Open My Clubs
            </Link>
          }
        />

        <SurfaceSection
          eyebrow="Visibility"
          title="Private clubs stay private"
          description="Private links open only after approval."
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
          <div className="text-sm text-rose-800">{error}</div>
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

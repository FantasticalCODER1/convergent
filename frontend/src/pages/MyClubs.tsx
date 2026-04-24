import { addDays } from 'date-fns';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { ClubCard } from '../components/ClubCard';
import { MetricCard, PageHeader, StatRow, SurfaceSection } from '../components/ui/product';
import { getClubAccessState } from '../domain/memberships';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { shouldUseStudentClubPlaceholder } from '../lib/productTruth';

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
    () => clubs.filter((club) => getClubAccessState(user, club, membershipMap) === 'pending_member'),
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
        <PageHeader
          eyebrow="Ownership"
          title="My Clubs"
          description="Approved clubs, pending requests, and private workspace links."
          aside={
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricCard label="Approved" value="0" hint="No approved clubs" />
              <MetricCard label="Pending" value="0" hint="No open requests" tone="accent" />
            </div>
          }
        />

        <SurfaceSection
          eyebrow="Memberships"
          title="Club workspace"
          action={
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[var(--paper-soft)]"
            >
              Back to calendar
            </button>
          }
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="ledger-table">
              <div className="ledger-header grid-cols-1">
                <span>Approved clubs</span>
              </div>
              <div className="ledger-row grid-cols-1 text-sm text-[var(--text-muted)]">
                <span>No approved clubs yet.</span>
              </div>
            </div>
            <div className="ledger-table">
              <div className="ledger-header grid-cols-1">
                <span>Pending requests</span>
              </div>
              <div className="ledger-row grid-cols-1 text-sm text-[var(--text-muted)]">
                <span>No pending requests.</span>
              </div>
            </div>
            <div className="ledger-table">
              <div className="ledger-header grid-cols-1">
                <span>Private links</span>
              </div>
              <div className="ledger-row grid-cols-1 text-sm text-[var(--text-muted)]">
                <span>Hidden until access is approved.</span>
              </div>
            </div>
          </div>
        </SurfaceSection>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ownership"
        title="My Clubs"
        description="Approved memberships and managed groups."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Approved" value={String(mine.length)} hint="Visible in your workspace" />
            <MetricCard label="Pending" value={String(pending.length)} hint="Still awaiting approval" tone={pending.length > 0 ? 'warning' : 'muted'} />
          </div>
        }
      />

      {pending.length > 0 ? (
        <SurfaceSection eyebrow="Pending" title="Requests still waiting" tone="warning">
          <div className="flex flex-wrap gap-2">
            {pending.map((club) => (
              <span key={club.id} className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2 text-sm text-[var(--text-strong)]">
                {club.name}
              </span>
            ))}
          </div>
        </SurfaceSection>
      ) : null}

      {loading ? (
        <SurfaceSection eyebrow="Memberships" title="Loading clubs">
          <div className="text-sm text-[var(--text-muted)]">Loading memberships…</div>
        </SurfaceSection>
      ) : error ? (
        <SurfaceSection eyebrow="Memberships" title="Membership data unavailable" tone="warning">
          <div className="text-sm text-rose-800">{error}</div>
        </SurfaceSection>
      ) : mine.length === 0 ? (
        <EmptyStateCard
          eyebrow="My clubs"
          title="No approved memberships yet"
          body="Approved groups will appear here automatically and feed into your personal calendar. Discovery and pending requests remain on the Join Clubs page."
          actionLabel="Open Join Clubs"
          onAction={() => navigate('/join-clubs')}
        />
      ) : (
          <SurfaceSection
            eyebrow="Workspace access"
            title="Approved memberships"
            action={
              <Link
                to="/join-clubs"
                className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
              >
                Browse all groups
            </Link>
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {mine.map((club) => {
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
            })}
          </div>
        </SurfaceSection>
      )}
    </div>
  );
}

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
          description="Student club memberships stay in explicit placeholder mode locally until the real directory and approval data are ready to replace the seeded development fixtures."
          aside={
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Memberships" value="0" hint="Held back intentionally" />
              <MetricCard label="Workspace access" value="Staged" hint="No fake club feed shown" tone="accent" />
            </div>
          }
        />

        <EmptyStateCard
          eyebrow="Student clubs"
          title={STUDENT_CLUB_PLACEHOLDER.title}
          body="There are no truthful student club memberships to show yet. When the club programme is live, approved clubs will appear here automatically together with their calendar-linked workspace access."
          actionLabel="Back to calendar"
          onAction={() => navigate('/calendar')}
          tone="accent"
        />

        <SurfaceSection
          eyebrow="What will appear here"
          title="Approved memberships only"
          description="This page is reserved for clubs you genuinely belong to or manage. Pending requests remain in discovery, and unreleased club fixtures are kept out instead of being styled as real product data."
        >
          <div className="space-y-3">
            <StatRow label="Approved clubs" value="Appear automatically after approval" />
            <StatRow label="Pending requests" value="Stay on Join Clubs" />
            <StatRow label="Private links" value="Hidden until access is real" />
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
        description="This page is reserved for approved memberships and managed groups. Anything still waiting for approval remains in Join Clubs until access is granted."
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
              <span key={club.id} className="rounded-full border border-white/10 px-3 py-2 text-sm text-[var(--text-strong)]">
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
          <div className="text-sm text-rose-100">{error}</div>
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
          description="Club workspaces only appear here once access is real. Discovery remains separate so this page can stay focused on clubs you already operate inside."
          action={
            <Link
              to="/join-clubs"
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
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

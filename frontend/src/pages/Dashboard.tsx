import { addDays, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { getClubAccessState } from '../domain/memberships';
import { isProfileComplete } from '../domain/profile';
import { useAuth } from '../hooks/useAuth';
import { usePersonalCalendar } from '../hooks/usePersonalCalendar';
import { formatDateTimeRange } from '../lib/formatters';
import { STUDENT_CLUB_PLACEHOLDER, shouldUseStudentClubPlaceholder } from '../lib/productTruth';
import { MetricCard, PageHeader, StatRow, SurfaceSection } from '../components/ui/product';

function getUpcomingEmptyState(profileReady: boolean, academicStatus: string, mealStatus: string) {
  if (!profileReady) {
    return 'Finish grade and section mapping to unlock timetable and meals. School-wide and approved club items will still appear here when available.';
  }
  if (academicStatus === 'missing' && mealStatus === 'missing') {
    return 'Timetable and meals are not live in this environment yet. School-wide and approved club events will still appear here when published.';
  }
  return 'No school-wide events, approved club activity, or matched schedule items are queued right now.';
}

function getScheduleDetail(
  kind: 'academic' | 'meal',
  readiness: {
    profileReady: boolean;
    academicStatus: string;
    mealStatus: string;
    academicEntriesMatched: number;
    mealEntriesMatched: number;
  }
) {
  const status = kind === 'academic' ? readiness.academicStatus : readiness.mealStatus;
  const matched = kind === 'academic' ? readiness.academicEntriesMatched : readiness.mealEntriesMatched;
  if (!readiness.profileReady) {
    return 'Profile mapping is still incomplete.';
  }
  if (status === 'missing') {
    return kind === 'academic' ? 'Timetable is not live in this environment.' : 'Meals are not live in this environment.';
  }
  if (matched === 0) {
    return kind === 'academic'
      ? 'A dataset record exists, but nothing maps to your cohort yet.'
      : 'A meal dataset record exists, but nothing maps to your cohort yet.';
  }
  return kind === 'academic' ? 'Mapped from live cohort schedule entries.' : 'Mapped from live cohort meal entries.';
}

export default function Dashboard() {
  const { user } = useAuth();
  const showStudentClubPlaceholder = shouldUseStudentClubPlaceholder(user);
  const calendarWindow = useMemo(
    () => ({
      rangeStart: subDays(startOfDay(new Date()), 1),
      rangeEnd: addDays(new Date(), 45)
    }),
    []
  );
  const {
    clubs,
    membershipMap,
    upcomingItems,
    nextAcademicItem,
    nextMealItem,
    nextGroupItem,
    nextSchoolWideItem,
    readiness,
    loading
  } = usePersonalCalendar(calendarWindow);

  const myClubs = useMemo(
    () =>
      clubs.filter((club) => {
        const accessState = getClubAccessState(user, club, membershipMap);
        return accessState === 'manager' || accessState === 'approved_member';
      }),
    [clubs, membershipMap, user]
  );

  const pendingClubs = useMemo(
    () => clubs.filter((club) => getClubAccessState(user, club, membershipMap) === 'pending_member'),
    [clubs, membershipMap, user]
  );

  const nextCards = [
    {
      label: 'Next class',
      title: nextAcademicItem?.title ?? 'No class mapped',
      detail: nextAcademicItem ? formatDateTimeRange(nextAcademicItem.startTime, nextAcademicItem.endTime) : getScheduleDetail('academic', readiness)
    },
    {
      label: 'Next meal',
      title: nextMealItem?.title ?? 'No meal mapped',
      detail: nextMealItem ? formatDateTimeRange(nextMealItem.startTime, nextMealItem.endTime) : getScheduleDetail('meal', readiness)
    },
    {
      label: 'Next club meeting',
      title: nextGroupItem?.title ?? 'No approved group event',
      detail: nextGroupItem
        ? `${nextGroupItem.relatedGroup?.name ?? 'Group'} · ${formatDateTimeRange(nextGroupItem.startTime, nextGroupItem.endTime)}`
        : 'Approved memberships automatically feed this slot.'
    },
    {
      label: 'School-wide',
      title: nextSchoolWideItem?.title ?? 'No upcoming school item',
      detail: nextSchoolWideItem ? formatDateTimeRange(nextSchoolWideItem.startTime, nextSchoolWideItem.endTime) : 'School-wide events appear here when published.'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Personal operations"
        description="This home surface now prioritises what is next, what is quiet, and what is not live yet, so the student workspace reads like a practical school product instead of a decorative dashboard."
        aside={
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Queue" value={String(upcomingItems.length)} hint="Items in the next 45 days" />
            <MetricCard label="My clubs" value={String(myClubs.length)} hint="Approved or managed groups" />
            <MetricCard
              label="Readiness"
              value={readiness.profileReady ? 'Ready' : 'Pending'}
              hint={readiness.profileReady ? 'Profile can map schedule data' : 'Grade + section still missing'}
              tone={readiness.profileReady ? 'muted' : 'warning'}
            />
          </div>
        }
      />

      {!isProfileComplete(user) ? (
        <EmptyStateCard
          eyebrow="Profile setup"
          title="Finish grade and section mapping"
          body="Timetable and meal blocks remain intentionally blank until your profile can be matched to a real cohort dataset."
          tone="warning"
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <SurfaceSection
            eyebrow="Today"
            title="At a glance"
            description="The dashboard now treats the next academic block, meal, club event, and school-wide item as one operating view instead of separate metric cards."
            action={
              <Link
                to="/calendar"
                className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
              >
                Open calendar
              </Link>
            }
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="rounded-[24px] border border-white/8 bg-[rgba(10,15,27,0.34)] p-5">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">Today&apos;s frame</p>
                <p className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-[var(--text-strong)]">{upcomingItems.length}</p>
                <p className="mt-2 text-lg font-medium text-[var(--text-strong)]">
                  {upcomingItems.length === 1 ? 'item currently queued' : 'items currently queued'}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
                  {getUpcomingEmptyState(readiness.profileReady, readiness.academicStatus, readiness.mealStatus)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {nextCards.map((card) => (
                  <div key={card.label} className="rounded-[24px] border border-white/8 bg-[rgba(10,15,27,0.34)] p-5">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">{card.label}</p>
                    <h2 className="mt-3 text-[1.85rem] font-semibold tracking-[-0.04em] text-[var(--text-strong)]">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Upcoming"
            title="Personal queue"
            description="Upcoming items keep a denser, list-first treatment so the dashboard feels closer to a real student home screen."
          >
            {loading ? (
              <div className="rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.32)] px-5 py-4 text-sm text-[var(--text-muted)]">
                Loading your queue…
              </div>
            ) : upcomingItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                {getUpcomingEmptyState(readiness.profileReady, readiness.academicStatus, readiness.mealStatus)}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-[24px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div>
                      <p className="text-lg font-semibold text-[var(--text-strong)]">{item.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{formatDateTimeRange(item.startTime, item.endTime)}</p>
                    </div>
                    <div className="text-sm text-[var(--text-muted)] md:text-right">
                      <p className="font-medium text-[var(--text-strong)]">{item.relatedGroup?.name ?? item.category}</p>
                      <p className="mt-1">{item.location ?? 'Location pending'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceSection>
        </div>

        <div className="space-y-6">
          {showStudentClubPlaceholder ? (
            <EmptyStateCard
              eyebrow="Student clubs"
              title={STUDENT_CLUB_PLACEHOLDER.title}
              body="The dashboard no longer reports fake memberships, approvals, or club counts for students in this local environment. Club surfaces stay intentionally limited until real school data replaces the development fixtures."
              actionLabel="Open calendar"
              onAction={() => window.location.assign('/calendar')}
              tone="accent"
            />
          ) : (
            <SurfaceSection
              eyebrow="Memberships"
              title="My clubs"
              description="Approved clubs remain visible here, while pending requests keep their own status instead of inflating the main queue."
            >
              {myClubs.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                  No approved clubs yet. Discovery and pending requests remain on the Join Clubs page until approval is granted.
                </div>
              ) : (
                <div className="space-y-3">
                  {myClubs.slice(0, 4).map((club) => (
                    <Link
                      key={club.id}
                      to={`/my-clubs/${club.id}`}
                      className="block rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-5 py-4 transition hover:bg-[rgba(17,24,43,0.7)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-[var(--text-strong)]">{club.name}</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">{club.schedule}</p>
                        </div>
                        <span className="text-sm text-[var(--text-muted)]">{club.memberCount} members</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <StatRow label="Pending approvals" value={`${pendingClubs.length} open`} />
              </div>
            </SurfaceSection>
          )}

          <SurfaceSection
            eyebrow="Readiness"
            title="What this environment can show"
            description="Operational truth stays explicit here so the dashboard does not pretend timetable or meal coverage exists when it does not."
          >
            <div className="space-y-3">
              <StatRow label="Profile mapping" value={readiness.profileReady ? 'Ready' : 'Needs grade + section'} />
              <StatRow label="Academic dataset" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} mapped`} />
              <StatRow label="Meal dataset" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} mapped`} />
            </div>
            <Link
              to="/classes"
              className="mt-5 inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
            >
              Open classes
            </Link>
          </SurfaceSection>
        </div>
      </div>
    </div>
  );
}

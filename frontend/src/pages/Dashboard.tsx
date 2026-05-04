import { addDays, format, isSameDay, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ProfileSetupGate } from '../components/ProfileSetupGate';
import { getClubAccessState } from '../domain/memberships';
import { isProfileComplete } from '../domain/profile';
import { useAuth } from '../hooks/useAuth';
import { useCertificates } from '../hooks/useCertificates';
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
  const { user, refreshProfile } = useAuth();
  const { certificates } = useCertificates();
  const showStudentClubPlaceholder = shouldUseStudentClubPlaceholder(user);
  const cohortLabel = user?.grade && user.section ? `${user.grade} / ${user.section}` : 'Cohort pending';
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
  const todayItems = useMemo(
    () => upcomingItems.filter((item) => isSameDay(new Date(item.startTime), new Date())).slice(0, 8),
    [upcomingItems]
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
        : 'No approved club meeting is scheduled.'
    },
    {
      label: 'School-wide',
      title: nextSchoolWideItem?.title ?? 'No upcoming school item',
      detail: nextSchoolWideItem ? formatDateTimeRange(nextSchoolWideItem.startTime, nextSchoolWideItem.endTime) : 'No school-wide event is scheduled.'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Today"
        description="Your classes, meals, club activity, and school notices for today."
        aside={
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricCard label="Queue" value={String(upcomingItems.length)} hint="Next 45 days" />
            <MetricCard label="Cohort" value={user?.grade && user?.section ? `${user.grade}/${user.section}` : 'Pending'} hint="Profile mapping" />
            <MetricCard
              label="Readiness"
              value={readiness.profileReady ? 'Ready' : 'Pending'}
              hint={readiness.profileReady ? 'Timetable matched' : 'Grade + section missing'}
              tone={readiness.profileReady ? 'muted' : 'warning'}
            />
          </div>
        }
      />

      {!isProfileComplete(user) ? (
        <ProfileSetupGate user={user} onComplete={refreshProfile} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <SurfaceSection
            eyebrow="Today"
            title="Next up"
            action={
              <Link
                to="/calendar"
                className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
              >
                Open calendar
              </Link>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
              <div className="notice-pin self-start rounded-[12px] border border-[color:var(--line)] p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">Today</p>
                <p className="serif-display mt-2 text-3xl font-semibold text-[var(--text-strong)]">{format(new Date(), 'd MMM')}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Spring Term 2026 · {cohortLabel}</p>
              </div>
              <div className="ledger-table">
                {nextCards.map((card, index) => (
                  <div
                    key={card.label}
                    className={`grid gap-3 bg-[var(--paper-card)] px-4 py-3 md:grid-cols-[140px_minmax(0,1fr)] ${index !== nextCards.length - 1 ? 'border-b border-[color:var(--line-soft)]' : ''}`}
                  >
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--brass)]">{card.label}</p>
                    </div>
                    <div>
                      <h2 className="text-[1.25rem] font-semibold text-[var(--text-strong)]">{card.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{card.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Schedule"
            title="Today's schedule"
          >
            {loading ? (
              <div className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-4 py-4 text-sm text-[var(--text-muted)]">
                Loading today's schedule...
              </div>
            ) : todayItems.length === 0 ? (
              <div className="ledger-table">
                <div className="ledger-header grid-cols-[110px_minmax(0,1fr)_150px]">
                  <span>Time</span>
                  <span>Item</span>
                  <span>Location</span>
                </div>
                <div className="ledger-row grid-cols-[110px_minmax(0,1fr)_150px] text-sm text-[var(--text-muted)]">
                  <span>-</span>
                  <span>{getUpcomingEmptyState(readiness.profileReady, readiness.academicStatus, readiness.mealStatus)}</span>
                  <span>-</span>
                </div>
              </div>
            ) : (
              <div className="ledger-table">
                <div className="ledger-header grid-cols-[110px_minmax(0,1fr)_150px]">
                  <span>Time</span>
                  <span>Item</span>
                  <span>Location</span>
                </div>
                {todayItems.map((item) => (
                  <div key={item.id} className="ledger-row grid-cols-[110px_minmax(0,1fr)_150px] text-sm">
                    <span className="font-semibold text-[var(--academic-blue)]">{format(new Date(item.startTime), 'h:mm a')}</span>
                    <span>
                      <span className="block font-semibold text-[var(--text-strong)]">{item.title}</span>
                      <span className="text-[var(--text-muted)]">{item.relatedGroup?.name ?? item.category}</span>
                    </span>
                    <span className="text-[var(--text-muted)]">{item.location ?? 'TBC'}</span>
                  </div>
                ))}
              </div>
            )}
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Upcoming"
            title="Personal queue"
          >
            {loading ? (
              <div className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-4 py-4 text-sm text-[var(--text-muted)]">
                Loading your queue...
              </div>
            ) : upcomingItems.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-[color:var(--line)] bg-[color:var(--panel-2)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                {getUpcomingEmptyState(readiness.profileReady, readiness.academicStatus, readiness.mealStatus)}
              </div>
            ) : (
              <div className="ledger-table">
                {upcomingItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="ledger-row grid-cols-[minmax(0,1fr)_auto] text-sm"
                  >
                    <div>
                      <p className="font-semibold text-[var(--text-strong)]">{item.title}</p>
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

        <div className="space-y-5">
          <SurfaceSection eyebrow="Notices" title="School notices">
            <div className="rounded-[10px] border border-dashed border-[color:var(--line)] bg-[color:var(--paper-soft)] px-4 py-4 text-sm text-[var(--text-muted)]">
              No notices published today.
            </div>
          </SurfaceSection>

          {showStudentClubPlaceholder ? (
            <SurfaceSection eyebrow="Clubs" title="Club activity">
              <div className="ledger-table">
                <div className="ledger-header grid-cols-[minmax(0,1fr)_110px]">
                  <span>Status</span>
                  <span>Count</span>
                </div>
                <div className="ledger-row grid-cols-[minmax(0,1fr)_110px] text-sm">
                  <span className="text-[var(--text-muted)]">{STUDENT_CLUB_PLACEHOLDER.title}</span>
                  <span className="font-semibold text-[var(--text-strong)]">0</span>
                </div>
              </div>
              <Link to="/join-clubs" className="mt-4 inline-flex rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[var(--paper-soft)]">
                Open Join Clubs
              </Link>
            </SurfaceSection>
          ) : (
            <SurfaceSection
              eyebrow="Memberships"
              title="Club activity"
            >
              {myClubs.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[color:var(--line)] bg-[color:var(--panel-2)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                  No approved clubs yet. Discovery and pending requests remain on the Join Clubs page until approval is granted.
                </div>
              ) : (
                <div className="ledger-table">
                  {myClubs.slice(0, 4).map((club) => (
                    <Link
                      key={club.id}
                      to={`/my-clubs/${club.id}`}
                      className="block border-t border-[color:var(--line-soft)] bg-[var(--paper-card)] px-4 py-3 transition first:border-t-0 hover:bg-[color:var(--panel-2)]"
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
            eyebrow="Records"
            title="Student records"
          >
            <div>
              <StatRow label="Certificates" value={`${certificates.length} issued`} />
              <StatRow label="Verification" value="Available for issued records" />
            </div>
            <Link
              to="/certificates"
              className="mt-4 inline-flex rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
            >
              Open records
            </Link>
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Profile"
            title="Profile status"
          >
            <div>
              <StatRow label="Profile mapping" value={readiness.profileReady ? 'Ready' : 'Needs grade + section'} />
              <StatRow label="Academic dataset" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} mapped`} />
              <StatRow label="Meal dataset" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} mapped`} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/classes"
                className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
              >
                Open classes
              </Link>
              <Link
                to="/calendar"
                className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
              >
                Open planner
              </Link>
            </div>
          </SurfaceSection>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { isProfileComplete } from '../domain/profile';
import { getClubAccessState } from '../domain/memberships';
import { useAuth } from '../hooks/useAuth';
import { usePersonalCalendar } from '../hooks/usePersonalCalendar';
import { formatDateTimeRange } from '../lib/formatters';

function getUpcomingEmptyState(profileReady: boolean, academicStatus: string, mealStatus: string) {
  if (!profileReady) return 'Finish grade and section mapping to unlock timetable and meals. School-wide and approved club events will still appear here when available.';
  if (academicStatus === 'missing' && mealStatus === 'missing') return 'No timetable or meal datasets are attached yet. School-wide and approved club events will appear here as soon as they are published.';
  return 'No school-wide events, approved club activity, or matched schedule items are queued right now.';
}

export default function Dashboard() {
  const { user } = useAuth();
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
  } = usePersonalCalendar();

  const myClubs = useMemo(
    () =>
      clubs.filter((club) => {
        const accessState = getClubAccessState(user, club, membershipMap);
        return accessState === 'manager' || accessState === 'approved_member';
      }),
    [clubs, membershipMap, user]
  );

  const pendingClubs = useMemo(
    () =>
      clubs.filter((club) => getClubAccessState(user, club, membershipMap) === 'pending_member'),
    [clubs, membershipMap, user]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Dashboard</p>
        <h1 className="text-3xl font-semibold text-white">Personal operations</h1>
        <p className="mt-2 max-w-3xl text-white/60">
          This surface now reads from the same personal calendar composition as the main calendar page, so your next class, meal, club meeting, and upcoming items stay consistent.
        </p>
      </div>

      {!isProfileComplete(user) ? (
        <EmptyStateCard
          eyebrow="Profile setup"
          title="Finish grade and section mapping"
          body="Timetable and meal blocks remain intentionally blank until your profile can be matched to a real cohort dataset."
          tone="warning"
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FocusCard
          label="Next class"
          title={nextAcademicItem?.title ?? 'No class mapped'}
          detail={nextAcademicItem ? formatDateTimeRange(nextAcademicItem.startTime, nextAcademicItem.endTime) : 'Timetable import still missing for your cohort.'}
        />
        <FocusCard
          label="Next meal"
          title={nextMealItem?.title ?? 'No meal mapped'}
          detail={nextMealItem ? formatDateTimeRange(nextMealItem.startTime, nextMealItem.endTime) : 'Meal blocks appear once a schedule dataset is attached.'}
        />
        <FocusCard
          label="Next club meeting"
          title={nextGroupItem?.title ?? 'No approved group event'}
          detail={nextGroupItem ? `${nextGroupItem.relatedGroup?.name ?? 'Group'} · ${formatDateTimeRange(nextGroupItem.startTime, nextGroupItem.endTime)}` : 'Approved memberships automatically feed this slot.'}
        />
        <FocusCard
          label="School-wide"
          title={nextSchoolWideItem?.title ?? 'No upcoming school item'}
          detail={nextSchoolWideItem ? formatDateTimeRange(nextSchoolWideItem.startTime, nextSchoolWideItem.endTime) : 'School-wide events appear here when published.'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glass">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Upcoming</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Your next personal items</h2>
            </div>
            <Link to="/calendar" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
              Open calendar
            </Link>
          </div>
          {loading ? (
            <div className="mt-4 text-white/60">Loading your queue…</div>
          ) : upcomingItems.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">
              {getUpcomingEmptyState(readiness.profileReady, readiness.academicStatus, readiness.mealStatus)}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {upcomingItems.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-white/60">{formatDateTimeRange(item.startTime, item.endTime)}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/55">
                      {item.relatedGroup?.name ?? item.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">My clubs</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Approved memberships</h2>
            {myClubs.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No approved clubs yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {myClubs.slice(0, 4).map((club) => (
                  <Link
                    key={club.id}
                    to={`/my-clubs/${club.id}`}
                    className="block rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white transition hover:bg-white/10"
                  >
                    <div className="font-medium">{club.name}</div>
                    <div className="mt-1 text-xs text-white/55">{club.schedule}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Pending</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Join requests</h2>
            {pendingClubs.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No pending club approvals.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {pendingClubs.map((club) => (
                  <div key={club.id} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white">
                    <div className="font-medium">{club.name}</div>
                    <div className="mt-1 text-xs text-white/55">Awaiting manager or master approval</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Readiness</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Data imports</h2>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <StatusRow label="Profile" value={readiness.profileReady ? 'Ready' : 'Needs grade + section'} />
              <StatusRow label="Academic" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} mapped`} />
              <StatusRow label="Meals" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} mapped`} />
            </div>
            <Link to="/classes" className="mt-4 inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
              Open classes
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FocusCard({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-white shadow-glass">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm text-white/60">{detail}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
      <span className="text-white/50">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}

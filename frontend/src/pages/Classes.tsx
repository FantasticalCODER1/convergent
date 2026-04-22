import { useState } from 'react';
import { isGoogleAuthConfigured } from '../auth/google';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { MetricCard, PageHeader, StatRow, SurfaceSection } from '../components/ui/product';
import { isProfileComplete } from '../domain/profile';
import { useAuth } from '../hooks/useAuth';
import { useClassroom } from '../hooks/useClassroom';
import { useSchedules } from '../hooks/useSchedules';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';
import { formatTimestamp } from '../lib/formatters';
import type { ClassroomCourse } from '../services/classroomService';

function formatDueDate(due?: { year: number; month: number; day: number }) {
  if (!due) return 'n/a';
  const month = String(due.month).padStart(2, '0');
  const day = String(due.day).padStart(2, '0');
  return `${due.year}-${month}-${day}`;
}

export default function Classes() {
  const { user } = useAuth();
  const {
    courses,
    coursework,
    loadingCourses,
    loadingWork,
    error,
    openCourse,
    reconnect,
    sessionStatus,
    classroomSupported
  } = useClassroom();
  const { entries, datasets, loading: loadingSchedules, error: scheduleError } = useSchedules();
  const [selected, setSelected] = useState<ClassroomCourse | null>(null);
  const classroomUnavailableMessage = isFirebaseEmulatorMode
    ? 'Google Classroom is intentionally disabled in local emulator mode. The supported local path is the timetable-driven calendar and classes view.'
    : !isGoogleAuthConfigured()
      ? 'Classroom is unavailable until Google OAuth is configured for this environment.'
      : 'Classroom is attached here only when a recoverable Google session is available.';

  if (!user) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[rgba(18,25,43,0.9)] p-6 text-[var(--text-muted)] shadow-[0_24px_60px_rgba(3,8,22,0.28)]">
        Sign in to view your timetable and Classroom surface.
      </div>
    );
  }

  const selectCourse = async (course: ClassroomCourse) => {
    setSelected(course);
    await openCourse(course);
  };

  const personalisedEntries = entries.filter((entry) => {
    const gradeMatches = !entry.grade || entry.grade.toLowerCase() === String(user.grade ?? '').trim().toLowerCase();
    const sectionMatches = !entry.section || entry.section.toLowerCase() === String(user.section ?? '').trim().toLowerCase();
    return gradeMatches && sectionMatches;
  });
  const academicEntries = personalisedEntries.filter((entry) => entry.scheduleType === 'academic');
  const mealEntries = personalisedEntries.filter((entry) => entry.scheduleType === 'meal');
  const academicDatasets = datasets.filter((dataset) => dataset.scheduleType === 'academic');
  const mealDatasets = datasets.filter((dataset) => dataset.scheduleType === 'meal');
  const hasAcademicDataset = academicDatasets.length > 0;
  const hasMealDataset = mealDatasets.length > 0;

  const academicEmptyState = !hasAcademicDataset
    ? {
        title: 'Timetable is not live in this environment',
        body: 'No academic dataset metadata has been published yet, so there is no defensible timetable surface to show here.'
      }
    : academicEntries.length === 0
      ? {
          title: 'Academic datasets exist, but your cohort is not mapped',
          body: 'Convergent can see schedule dataset records, but there are no live academic entries for this grade-section combination yet.'
        }
      : null;

  const mealEmptyState = !hasMealDataset
    ? 'Meals are not live in this environment yet.'
    : mealEntries.length === 0
      ? 'Meal dataset metadata exists, but there are no live meal entries for your cohort yet.'
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic structure"
        title="Classes"
        description="This page shows only real cohort timetable mappings, published dataset metadata, and attached Classroom data when a Google session can actually recover. It no longer pretends to be a full school operating system."
        aside={
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Academic datasets" value={String(academicDatasets.length)} hint="Published timetable records" />
            <MetricCard label="Meal datasets" value={String(mealDatasets.length)} hint="Published dining records" />
            <MetricCard
              label="Classroom"
              value={sessionStatus === 'ready' ? 'Live' : sessionStatus === 'needs_reconnect' ? 'Reconnect' : 'Limited'}
              hint={sessionStatus === 'ready' ? `${courses.length} course${courses.length === 1 ? '' : 's'}` : 'Attached service only'}
              tone={sessionStatus === 'ready' ? 'muted' : 'warning'}
            />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <SurfaceSection
            eyebrow="Timetable"
            title="Personal timetable mapping"
            description="The main academic surface is now organised as one timetable region with explicit dataset status, not a stack of unrelated cards."
            action={
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
                {user.grade && user.section ? `${user.grade} · ${user.section}` : 'Profile incomplete'}
              </span>
            }
          >
            {scheduleError ? <p className="text-sm text-rose-300">{scheduleError}</p> : null}

            {!isProfileComplete(user) ? (
              <EmptyStateCard
                eyebrow="Profile mapping"
                title="Grade and section are required"
                body="Convergent cannot test timetable or meal coverage until your grade and section are stored on the profile."
                tone="warning"
              />
            ) : loadingSchedules ? (
              <div className="rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-5 py-5 text-sm text-[var(--text-muted)]">
                Loading timetable structure…
              </div>
            ) : academicEntries.length === 0 ? (
              <EmptyStateCard
                eyebrow="Timetable dataset"
                title={academicEmptyState?.title ?? 'No academic blocks mapped yet'}
                body={academicEmptyState?.body ?? 'No academic blocks are mapped yet.'}
                tone="accent"
              />
            ) : (
              <div className="space-y-3">
                {academicEntries.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="grid gap-3 rounded-[24px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                      <p className="text-lg font-semibold text-[var(--text-strong)]">{entry.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{entry.blockName}</p>
                    </div>
                    <div className="text-sm text-[var(--text-muted)] md:text-right">
                      <div className="font-medium text-[var(--text-strong)]">
                        {entry.startTime} - {entry.endTime}
                      </div>
                      <div className="mt-1">{entry.location ?? 'Location pending'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <SurfaceSection eyebrow="Meal schedules" title="Meal blocks">
              {mealEntries.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                  {mealEmptyState}
                </div>
              ) : (
                <div className="space-y-3">
                  {mealEntries.map((entry) => (
                    <div key={entry.id} className="rounded-[20px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-4 py-3">
                      <div className="text-base font-semibold text-[var(--text-strong)]">{entry.title}</div>
                      <div className="mt-1 text-sm text-[var(--text-muted)]">
                        {entry.startTime} - {entry.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceSection>

            <SurfaceSection eyebrow="Datasets" title="Published records">
              {[...academicDatasets, ...mealDatasets].length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                  No timetable or meal dataset records have been published yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {[...academicDatasets, ...mealDatasets].map((dataset) => (
                    <div key={dataset.id} className="rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-semibold text-[var(--text-strong)]">{dataset.title}</span>
                        <span className="text-xs uppercase tracking-[0.25em] text-[var(--text-faint)]">{dataset.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {dataset.scheduleType} dataset · updated {formatTimestamp(dataset.updatedAt, 'not recorded')}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{dataset.notes ?? 'No additional dataset notes recorded.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceSection>
          </div>
        </div>

        <div className="space-y-6">
          <SurfaceSection
            eyebrow="Google Classroom"
            title="Attached coursework surface"
            description="Classroom remains visibly attached here, but timetable truth stays separate so the page does not imply Google is the scheduling authority."
          >
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            {sessionStatus === 'checking' || loadingCourses ? (
              <div className="rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-5 py-5 text-sm text-[var(--text-muted)]">
                Checking Google session and loading courses…
              </div>
            ) : sessionStatus === 'ready' ? (
              <div className="space-y-3">
                <div className="rounded-[22px] border border-cyan-400/20 bg-[rgba(24,46,68,0.52)] px-5 py-5 text-sm leading-7 text-cyan-50">
                  Recovered Google session. Classroom is live here, but still treated as an attached coursework surface rather than the scheduling source of truth.
                </div>
                {courses.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                    No active courses found for your account.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => void selectCourse(course)}
                        className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                          selected?.id === course.id
                            ? 'border-white/18 bg-[rgba(27,39,63,0.92)]'
                            : 'border-white/8 bg-[rgba(10,15,27,0.34)] hover:bg-[rgba(17,24,43,0.7)]'
                        }`}
                      >
                        <p className="text-lg font-semibold text-[var(--text-strong)]">{course.name}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{course.section}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : sessionStatus === 'needs_reconnect' ? (
              <EmptyStateCard
                eyebrow="Reconnect"
                title="Classroom needs Google re-approval"
                body="Your Firebase session survived, but the Classroom token did not. Reconnect Google access to load live courses and coursework again."
                actionLabel="Reconnect Classroom"
                onAction={() => {
                  void reconnect();
                }}
              />
            ) : sessionStatus === 'unsupported' ? (
              <EmptyStateCard
                eyebrow="Local mode"
                title="Classroom is not part of the supported local path"
                body={classroomUnavailableMessage}
              />
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                {classroomUnavailableMessage}
              </div>
            )}
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Coursework"
            title={selected && sessionStatus === 'ready' ? `${selected.name} coursework` : 'Coursework rail'}
            description="Selected coursework stays here so the main page keeps timetable status and attached work clearly separated."
          >
            {selected && sessionStatus === 'ready' ? (
              loadingWork ? (
                <div className="rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-5 py-5 text-sm text-[var(--text-muted)]">
                  Fetching coursework…
                </div>
              ) : coursework.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                  No coursework posted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {coursework.map((work) => (
                    <a
                      key={work.id}
                      href={work.alternateLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-4 py-4 transition hover:bg-[rgba(17,24,43,0.7)]"
                    >
                      <p className="text-lg font-semibold text-[var(--text-strong)]">{work.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {work.state} · Due {formatDueDate(work.dueDate)}
                      </p>
                    </a>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <StatRow label="Timetable source" value="Published cohort datasets" />
                <StatRow label="Classroom source" value="Recoverable Google session only" />
                <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                  Course links and timetable mapping stay separate. Classroom remains an attached service for coursework only, not the source of truth for scheduling or club operations.
                </div>
              </div>
            )}
          </SurfaceSection>

          {sessionStatus !== 'ready' && !classroomSupported ? (
            <SurfaceSection eyebrow="Boundary" title="What stays available here" tone="accent">
              <div className="space-y-3">
                <StatRow label="Timetable" value="Uses local schedule datasets" />
                <StatRow label="Classroom links" value="Stored as references only" />
                <StatRow label="Coursework browsing" value="Requires live Google recovery" />
              </div>
            </SurfaceSection>
          ) : null}
        </div>
      </div>
    </div>
  );
}

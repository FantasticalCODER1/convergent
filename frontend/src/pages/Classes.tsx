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
    ? 'Google Classroom is disabled in local emulator mode. The local path uses timetable datasets and the classes view.'
    : !isGoogleAuthConfigured()
      ? 'Classroom is unavailable until Google OAuth is configured for this environment.'
      : 'Classroom is attached here only when a recoverable Google session is available.';

  if (!user) {
    return (
      <div className="rounded-[20px] border border-[color:var(--line)] bg-[color:var(--panel)] p-6 text-[var(--text-muted)] shadow-[0_12px_28px_rgba(133,152,176,0.14)]">
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
        description="Cohort timetable, meals, dataset records, and attached Classroom context."
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
            title="Personal timetable"
            action={
              <span className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
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
              <div className="rounded-[16px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-5 py-5 text-sm text-[var(--text-muted)]">
                Loading timetable structure…
              </div>
            ) : academicEntries.length === 0 ? (
              <div className="ledger-table">
                <div className="ledger-header grid-cols-[minmax(0,1.1fr)_90px_110px_100px_140px]">
                  <span>Class</span>
                  <span>Block</span>
                  <span>Time</span>
                  <span>Room</span>
                  <span>Teacher</span>
                </div>
                <div className="ledger-row grid-cols-[minmax(0,1.1fr)_90px_110px_100px_140px] text-sm text-[var(--text-muted)]">
                  <span>{academicEmptyState?.title ?? 'No academic blocks mapped yet'}</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              </div>
            ) : (
              <div className="ledger-table">
                <div className="ledger-header grid-cols-[minmax(0,1.1fr)_90px_120px_90px_150px]">
                  <span>Class</span>
                  <span>Block</span>
                  <span>Time</span>
                  <span>Room</span>
                  <span>Teacher</span>
                </div>
                {academicEntries.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="ledger-row grid-cols-[minmax(0,1.1fr)_90px_120px_90px_150px] text-sm">
                    <div>
                      <p className="font-semibold text-[var(--text-strong)]">{entry.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{entry.sourceDataset}</p>
                    </div>
                    <span className="text-[var(--text-muted)]">{entry.blockName}</span>
                    <span className="font-medium text-[var(--text-strong)]">{entry.startTime} - {entry.endTime}</span>
                    <span className="font-medium text-[var(--text-strong)]">{entry.location ?? 'TBC'}</span>
                    <span className="text-[var(--text-muted)]">{entry.teacher ?? 'TBC'}</span>
                  </div>
                ))}
              </div>
            )}
          </SurfaceSection>

          <div className="grid gap-6 lg:grid-cols-2">
          <SurfaceSection eyebrow="Meal schedules" title="Meal blocks">
            {mealEntries.length === 0 ? (
                <div className="ledger-table">
                  <div className="ledger-header grid-cols-[minmax(0,1fr)_120px_150px]">
                    <span>Meal</span>
                    <span>Time</span>
                    <span>Location</span>
                  </div>
                  <div className="ledger-row grid-cols-[minmax(0,1fr)_120px_150px] text-sm text-[var(--text-muted)]">
                    <span>{mealEmptyState}</span>
                    <span>-</span>
                    <span>-</span>
                  </div>
                </div>
              ) : (
                <div className="ledger-table">
                  <div className="ledger-header grid-cols-[minmax(0,1fr)_120px_150px]">
                    <span>Meal</span>
                    <span>Time</span>
                    <span>Location</span>
                  </div>
                  {mealEntries.map((entry) => (
                    <div key={entry.id} className="ledger-row grid-cols-[minmax(0,1fr)_120px_150px] text-sm">
                      <div className="font-semibold text-[var(--text-strong)]">{entry.title}</div>
                      <div className="text-[var(--text-muted)]">{entry.startTime} - {entry.endTime}</div>
                      <div className="text-[var(--text-muted)]">{entry.location ?? 'Dining Hall'}</div>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceSection>

            <SurfaceSection eyebrow="Datasets" title="Published records">
              {[...academicDatasets, ...mealDatasets].length === 0 ? (
                <div className="ledger-table">
                  <div className="ledger-header grid-cols-[minmax(0,1fr)_120px_140px]">
                    <span>Record</span>
                    <span>Source</span>
                    <span>Status</span>
                  </div>
                  <div className="ledger-row grid-cols-[minmax(0,1fr)_120px_140px] text-sm text-[var(--text-muted)]">
                    <span>No timetable or meal dataset records have been published yet.</span>
                    <span>-</span>
                    <span>-</span>
                  </div>
                </div>
              ) : (
                <div className="ledger-table">
                  <div className="ledger-header grid-cols-[minmax(0,1fr)_120px_140px]">
                    <span>Record</span>
                    <span>Source</span>
                    <span>Status</span>
                  </div>
                  {[...academicDatasets, ...mealDatasets].map((dataset) => (
                    <div key={dataset.id} className="ledger-row grid-cols-[minmax(0,1fr)_120px_140px] text-sm">
                      <span>
                        <span className="block font-semibold text-[var(--text-strong)]">{dataset.title}</span>
                        <span className="text-[var(--text-muted)]">Updated {formatTimestamp(dataset.updatedAt, 'not recorded')}</span>
                      </span>
                      <span className="text-[var(--text-muted)]">{dataset.sourceDataset ?? dataset.scheduleType}</span>
                      <span className="font-semibold text-[var(--text-strong)]">{dataset.status}</span>
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
            title="Classroom context"
          >
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            {sessionStatus === 'checking' || loadingCourses ? (
              <div className="rounded-[16px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-5 py-5 text-sm text-[var(--text-muted)]">
                Checking Google session and loading courses…
              </div>
            ) : sessionStatus === 'ready' ? (
              <div className="space-y-3">
                <div className="rounded-[10px] border border-[color:var(--academic-blue-line)] bg-[var(--academic-blue-soft)] px-5 py-5 text-sm leading-7 text-[var(--academic-blue)]">
                  Classroom session recovered.
                </div>
                {courses.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[color:var(--line)] bg-[color:var(--panel-2)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                    No active courses found for your account.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[18px] border border-[color:var(--line)]">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => void selectCourse(course)}
                        className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                          selected?.id === course.id
                            ? 'border-[var(--academic-blue)] bg-[var(--academic-blue-soft)]'
                            : 'border-t border-[color:var(--line)] bg-[var(--paper-card)] first:border-t-0 hover:bg-[color:var(--panel-2)]'
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
              <div className="rounded-[16px] border border-dashed border-[color:var(--line)] bg-[color:var(--panel-2)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                {classroomUnavailableMessage}
              </div>
            )}
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Coursework"
            title={selected && sessionStatus === 'ready' ? `${selected.name} coursework` : 'Coursework rail'}
          >
            {selected && sessionStatus === 'ready' ? (
              loadingWork ? (
                <div className="rounded-[16px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-5 py-5 text-sm text-[var(--text-muted)]">
                  Fetching coursework…
                </div>
              ) : coursework.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[color:var(--line)] bg-[color:var(--panel-2)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                  No coursework posted yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-[18px] border border-[color:var(--line)]">
                  {coursework.map((work) => (
                    <a
                      key={work.id}
                      href={work.alternateLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block border-t border-[color:var(--line)] bg-white px-4 py-4 transition first:border-t-0 hover:bg-[color:var(--panel-2)]"
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
                <div className="rounded-[16px] border border-dashed border-[color:var(--line)] bg-[color:var(--panel-2)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                  Course links and timetable mapping stay separate.
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

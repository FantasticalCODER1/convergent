import { useState } from 'react';
import { isGoogleAuthConfigured } from '../auth/google';
import { EmptyStateCard } from '../components/EmptyStateCard';
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
  const { courses, coursework, loadingCourses, loadingWork, error, openCourse, reconnect, sessionStatus } = useClassroom();
  const { entries, datasets, loading: loadingSchedules, error: scheduleError } = useSchedules();
  const [selected, setSelected] = useState<ClassroomCourse | null>(null);
  const classroomUnavailableMessage = isFirebaseEmulatorMode
    ? 'Live Classroom recovery is intentionally disabled in emulator mode.'
    : !isGoogleAuthConfigured()
      ? 'Classroom is unavailable until Google OAuth is configured for this environment.'
      : 'Classroom is attached here only when a recoverable Google session is available.';

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">
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
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/50">Academic structure</p>
        <h1 className="text-3xl font-semibold text-white">Classes</h1>
        <p className="text-white/60">
          This page only shows real cohort timetable mappings, published dataset metadata, and attached Classroom data when a Google session can actually recover. It is not presented as a full school operating system.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Timetable</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Personal timetable mapping</h2>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/60">
                {user.grade && user.section ? `${user.grade} · ${user.section}` : 'Profile incomplete'}
              </span>
            </div>
            {scheduleError ? <p className="mt-3 text-sm text-rose-300">{scheduleError}</p> : null}
            {!isProfileComplete(user) ? (
              <div className="mt-4">
                <EmptyStateCard
                  eyebrow="Profile mapping"
                  title="Grade and section are required"
                  body="Convergent cannot test timetable or meal coverage until your grade and section are stored on the profile."
                  tone="warning"
                />
              </div>
            ) : loadingSchedules ? (
              <p className="mt-4 text-white/60">Loading timetable structure…</p>
            ) : academicEntries.length === 0 ? (
              <div className="mt-4">
                <EmptyStateCard
                  eyebrow="Timetable dataset"
                  title={academicEmptyState?.title ?? 'No academic blocks mapped yet'}
                  body={academicEmptyState?.body ?? 'No academic blocks are mapped yet.'}
                  tone="accent"
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {academicEntries.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{entry.title}</p>
                        <p className="text-xs text-white/55">{entry.blockName}</p>
                      </div>
                      <div className="text-right text-sm text-white/70">
                        <div>{entry.startTime} - {entry.endTime}</div>
                        <div className="text-xs text-white/45">{entry.location ?? 'Location pending'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Meal schedules</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Meal blocks</h2>
              {mealEntries.length === 0 ? (
                <p className="mt-4 text-sm text-white/60">{mealEmptyState}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {mealEntries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white/75">
                      <div className="font-medium text-white">{entry.title}</div>
                      <div className="mt-1">{entry.startTime} - {entry.endTime}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Datasets</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Published dataset records</h2>
              <div className="mt-4 space-y-3">
                {[...academicDatasets, ...mealDatasets].length === 0 ? (
                  <p className="text-sm text-white/60">No timetable or meal dataset records have been published yet.</p>
                ) : (
                  [...academicDatasets, ...mealDatasets].map((dataset) => (
                    <div key={dataset.id} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white/75">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-white">{dataset.title}</span>
                        <span className="text-xs uppercase tracking-[0.25em] text-white/45">{dataset.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {dataset.scheduleType} dataset · updated {formatTimestamp(dataset.updatedAt, 'not recorded')}
                      </p>
                      <p className="mt-2 text-xs text-white/50">{dataset.notes ?? 'No additional dataset notes recorded.'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
            <h2 className="text-xl font-semibold text-white">Google Classroom</h2>
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            {sessionStatus === 'checking' || loadingCourses ? (
              <p className="mt-4 text-white/60">Checking Google session and loading courses…</p>
            ) : sessionStatus === 'ready' ? (
              <div className="mt-2 text-sm text-white/60">Recovered Google session. Classroom remains an attached coursework surface, not the scheduling authority.</div>
            ) : sessionStatus === 'needs_reconnect' ? (
              <div className="mt-4 space-y-3">
                <EmptyStateCard
                  eyebrow="Reconnect"
                  title="Classroom needs Google re-approval"
                  body="Your Firebase session survived, but the Classroom token did not. Reconnect Google access to load live courses and coursework again."
                  actionLabel="Reconnect Classroom"
                  onAction={() => {
                    void reconnect();
                  }}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/60">{classroomUnavailableMessage}</p>
            )}
            {sessionStatus === 'ready' && loadingCourses ? (
              <p className="mt-4 text-white/60">Loading courses…</p>
            ) : sessionStatus === 'ready' ? (
              <div className="mt-4 space-y-3">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => selectCourse(course)}
                    className={`w-full rounded-2xl border border-white/5 bg-white/10 p-4 text-left text-white transition ${
                      selected?.id === course.id ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    <p className="text-lg font-semibold">{course.name}</p>
                    <p className="text-sm text-white/60">{course.section}</p>
                  </button>
                ))}
                {courses.length === 0 ? <p className="text-sm text-white/60">No active courses found for your account.</p> : null}
              </div>
            ) : sessionStatus === 'checking' ? null : (
              <div className="mt-4">
                <EmptyStateCard
                  eyebrow="Classroom links"
                  title="Live Classroom access is not available here"
                  body="The product can store Classroom references on clubs, events, and posts, but live coursework browsing still depends on a recoverable Google session in this environment."
                />
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
            {selected && sessionStatus === 'ready' ? (
              <>
                <h2 className="text-xl font-semibold text-white">{selected.name} coursework</h2>
                {loadingWork ? (
                  <p className="mt-4 text-white/60">Fetching coursework…</p>
                ) : coursework.length === 0 ? (
                  <p className="mt-4 text-white/60">No coursework posted yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {coursework.map((work) => (
                      <a
                        key={work.id}
                        href={work.alternateLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-white/5 bg-white/10 p-4 text-white transition hover:bg-white/20"
                      >
                        <p className="text-lg font-semibold">{work.title}</p>
                        <p className="text-sm text-white/60">
                          {work.state} · Due {formatDueDate(work.dueDate)}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyStateCard
                eyebrow="Section mapping"
                title="Course links and timetable mapping stay separate"
                body="Grade and section decide schedule coverage. Classroom remains an attached service for coursework only, not the source of truth for scheduling or club operations."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

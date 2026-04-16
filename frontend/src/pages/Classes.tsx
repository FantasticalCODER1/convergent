import { useState } from 'react';
import { isGoogleAuthConfigured } from '../auth/google';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { isProfileComplete } from '../domain/profile';
import { useAuth } from '../hooks/useAuth';
import { useClassroom } from '../hooks/useClassroom';
import { useSchedules } from '../hooks/useSchedules';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';
import type { ClassroomCourse } from '../services/classroomService';

function formatDueDate(due?: { year: number; month: number; day: number }) {
  if (!due) return 'n/a';
  const month = String(due.month).padStart(2, '0');
  const day = String(due.day).padStart(2, '0');
  return `${due.year}-${month}-${day}`;
}

export default function Classes() {
  const { user, accessToken } = useAuth();
  const { courses, coursework, loadingCourses, loadingWork, error, openCourse } = useClassroom();
  const { entries, datasets, loading: loadingSchedules, error: scheduleError } = useSchedules();
  const [selected, setSelected] = useState<ClassroomCourse | null>(null);
  const classroomUnavailableMessage = isFirebaseEmulatorMode
    ? 'Live Classroom sync is intentionally disabled in emulator mode.'
    : !isGoogleAuthConfigured()
      ? 'Classroom becomes available once Google auth is configured for this environment.'
      : 'Sign in with Google and grant Classroom access to view live courses.';

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/50">Academic structure</p>
        <h1 className="text-3xl font-semibold text-white">Classes</h1>
        <p className="text-white/60">This page combines timetable datasets, meal structure, and attached Classroom links. It is still a partial academic surface rather than a complete school operating system.</p>
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
                  body="The first-login flow now stores these fields on the user profile so Convergent can map users onto timetable datasets later."
                  tone="warning"
                />
              </div>
            ) : loadingSchedules ? (
              <p className="mt-4 text-white/60">Loading timetable structure…</p>
            ) : academicEntries.length === 0 ? (
              <div className="mt-4">
                <EmptyStateCard
                  eyebrow="Timetable dataset"
                  title="No academic blocks mapped yet"
                  body="The schedule entry model is in place, but there is no live dataset attached for this grade-section combination yet."
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
              <h2 className="mt-2 text-xl font-semibold text-white">Structured meal blocks</h2>
              {mealEntries.length === 0 ? (
                <p className="mt-4 text-sm text-white/60">No meal schedule dataset has been attached for your cohort yet.</p>
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
              <h2 className="mt-2 text-xl font-semibold text-white">Dataset readiness</h2>
              <div className="mt-4 space-y-3">
                {[...academicDatasets, ...mealDatasets].length === 0 ? (
                  <p className="text-sm text-white/60">No dataset metadata has been published yet. Placeholder records can now be added without redesigning this page.</p>
                ) : (
                  [...academicDatasets, ...mealDatasets].map((dataset) => (
                    <div key={dataset.id} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white/75">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-white">{dataset.title}</span>
                        <span className="text-xs uppercase tracking-[0.25em] text-white/45">{dataset.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">{dataset.notes ?? 'No additional dataset notes yet.'}</p>
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
            {!accessToken ? <p className="mt-2 text-sm text-white/60">{classroomUnavailableMessage}</p> : null}
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            {accessToken && loadingCourses ? (
              <p className="mt-4 text-white/60">Loading courses…</p>
            ) : accessToken ? (
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
            ) : (
              <div className="mt-4">
                <EmptyStateCard
                  eyebrow="Classroom links"
                  title="Live Classroom access is not available yet"
                  body="The data model can store Classroom references on clubs, events, and posts, but the live Classroom experience here is still limited and environment-dependent."
                />
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
            {selected && accessToken ? (
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
                body="Grade and section decide timetable datasets. Classroom is still an attached service layer here, not the source of truth for scheduling or club operations."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

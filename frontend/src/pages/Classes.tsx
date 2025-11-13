import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useClassroom } from '../hooks/useClassroom';
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
  const [selected, setSelected] = useState<ClassroomCourse | null>(null);

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">
        Sign in to view Classroom courses.
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">
        Sign in with Google and grant Classroom access to view your classes.
      </div>
    );
  }

  const selectCourse = async (course: ClassroomCourse) => {
    setSelected(course);
    await openCourse(course);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        <h2 className="text-xl font-semibold text-white">My courses</h2>
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        {loadingCourses ? (
          <p className="mt-4 text-white/60">Loading…</p>
        ) : (
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
            {courses.length === 0 && <p className="text-sm text-white/60">No active courses found for your account.</p>}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        {selected ? (
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
          <div className="grid h-full place-items-center text-white/60">Select a course to view assignments.</div>
        )}
      </div>
    </div>
  );
}

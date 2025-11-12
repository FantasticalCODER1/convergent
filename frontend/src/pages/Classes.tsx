import { useEffect, useState } from 'react';
import { fetchCourses, fetchCoursework } from '../services/ClassroomService';
import { useAuth } from '../context/AuthContext';

type Course = {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
};

type Coursework = {
  id: string;
  title: string;
  state?: string;
  dueDate?: { year: number; month: number; day: number };
  alternateLink?: string;
};

export default function Classes() {
  const { accessToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [coursework, setCoursework] = useState<Coursework[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingWork, setLoadingWork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoadingCourses(true);
    fetchCourses(accessToken)
      .then((data) => {
        setCourses(data);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load Google Classroom courses.');
      })
      .finally(() => {
        setLoadingCourses(false);
      });
  }, [accessToken]);

  const openCourse = async (course: Course) => {
    if (!accessToken) return;
    setSelected(course);
    setLoadingWork(true);
    try {
      const work = await fetchCoursework(accessToken, course.id);
      setCoursework(work);
    } catch (err) {
      console.error(err);
      setError('Unable to load coursework for this class.');
      setCoursework([]);
    } finally {
      setLoadingWork(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">
        Sign in with Google and grant Classroom access to view your classes.
      </div>
    );
  }

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
                onClick={() => openCourse(course)}
                className={`w-full rounded-2xl border border-white/5 bg-white/10 p-4 text-left text-white transition ${
                  selected?.id === course.id ? 'ring-2 ring-accent' : ''
                }`}
              >
                <p className="text-lg font-semibold">{course.name}</p>
                <p className="text-sm text-white/60">{course.section}</p>
              </button>
            ))}
            {courses.length === 0 && (
              <p className="text-sm text-white/60">No active courses found for your account.</p>
            )}
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

function formatDueDate(due?: Coursework['dueDate']) {
  if (!due) return 'n/a';
  const month = String(due.month).padStart(2, '0');
  const day = String(due.day).padStart(2, '0');
  return `${due.year}-${month}-${day}`;
}

import { useCallback, useEffect, useState } from 'react';
import type { ClassroomCourse, ClassroomCoursework } from '../services/classroomService';
import { listCoursework, listCourses } from '../services/classroomService';
import { useAuth } from './useAuth';

export function useClassroom() {
  const { accessToken } = useAuth();
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [coursework, setCoursework] = useState<ClassroomCoursework[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingWork, setLoadingWork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    if (!accessToken) return;
    setLoadingCourses(true);
    setError(null);
    try {
      const response = await listCourses(accessToken);
      setCourses(response);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load courses.');
    } finally {
      setLoadingCourses(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      void loadCourses();
    }
  }, [accessToken, loadCourses]);

  const openCourse = useCallback(
    async (course: ClassroomCourse) => {
      if (!accessToken) return;
      setLoadingWork(true);
      setError(null);
      try {
        const work = await listCoursework(course.id, accessToken);
        setCoursework(work);
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load coursework.');
        setCoursework([]);
      } finally {
        setLoadingWork(false);
      }
    },
    [accessToken]
  );

  return {
    courses,
    coursework,
    loadingCourses,
    loadingWork,
    error,
    loadCourses,
    openCourse
  };
}

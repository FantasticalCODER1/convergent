import { useCallback, useEffect, useState } from 'react';
import type { ClassroomCourse, ClassroomCoursework } from '../services/classroomService';
import { listCoursework, listCourses } from '../services/classroomService';
import { useAuth } from './useAuth';

export type ClassroomSessionStatus = 'idle' | 'checking' | 'ready' | 'needs_reconnect';

export function useClassroom() {
  const { accessToken, user, ensureGoogleAccessToken } = useAuth();
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [coursework, setCoursework] = useState<ClassroomCoursework[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingWork, setLoadingWork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<ClassroomSessionStatus>('idle');

  const resolveToken = useCallback(
    async (mode: 'interactive' | 'silent' = 'silent') => {
      if (accessToken) return accessToken;
      return (await ensureGoogleAccessToken?.(mode)) ?? null;
    },
    [accessToken, ensureGoogleAccessToken]
  );

  const loadCourses = useCallback(async (mode: 'interactive' | 'silent' = 'silent') => {
    if (!user) {
      setCourses([]);
      setCoursework([]);
      setSessionStatus('idle');
      return;
    }
    setLoadingCourses(true);
    setError(null);
    setSessionStatus('checking');
    try {
      const token = await resolveToken(mode);
      if (!token) {
        setCourses([]);
        setCoursework([]);
        setSessionStatus('needs_reconnect');
        return;
      }
      const response = await listCourses(token);
      setCourses(response);
      setSessionStatus('ready');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load courses.');
      setCourses([]);
      setCoursework([]);
      setSessionStatus('needs_reconnect');
    } finally {
      setLoadingCourses(false);
    }
  }, [resolveToken, user]);

  useEffect(() => {
    if (user) {
      void loadCourses('silent');
    } else {
      setCourses([]);
      setCoursework([]);
      setSessionStatus('idle');
    }
  }, [loadCourses, user]);

  const openCourse = useCallback(
    async (course: ClassroomCourse) => {
      if (!user) return;
      setLoadingWork(true);
      setError(null);
      try {
        const token = await resolveToken('silent');
        if (!token) {
          setSessionStatus('needs_reconnect');
          setCoursework([]);
          return;
        }
        const work = await listCoursework(course.id, token);
        setCoursework(work);
        setSessionStatus('ready');
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load coursework.');
        setSessionStatus('needs_reconnect');
        setCoursework([]);
      } finally {
        setLoadingWork(false);
      }
    },
    [resolveToken, user]
  );

  const reconnect = useCallback(async () => {
    await loadCourses('interactive');
  }, [loadCourses]);

  return {
    courses,
    coursework,
    loadingCourses,
    loadingWork,
    error,
    sessionStatus,
    loadCourses,
    openCourse,
    reconnect
  };
}

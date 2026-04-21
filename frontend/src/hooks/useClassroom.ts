import { useCallback, useEffect, useState } from 'react';
import { isGoogleAuthConfigured } from '../auth/google';
import type { ClassroomCourse, ClassroomCoursework } from '../services/classroomService';
import { listCoursework, listCourses } from '../services/classroomService';
import { useAuth } from './useAuth';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';

export type ClassroomSessionStatus = 'idle' | 'checking' | 'ready' | 'needs_reconnect' | 'unsupported';

export function useClassroom() {
  const { accessToken, user, ensureGoogleAccessToken } = useAuth();
  const classroomSupported = !isFirebaseEmulatorMode && isGoogleAuthConfigured();
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
    if (!classroomSupported) {
      setCourses([]);
      setCoursework([]);
      setError(null);
      setSessionStatus('unsupported');
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
  }, [classroomSupported, resolveToken, user]);

  useEffect(() => {
    if (!user) {
      setCourses([]);
      setCoursework([]);
      setSessionStatus('idle');
      return;
    }

    if (!classroomSupported) {
      setCourses([]);
      setCoursework([]);
      setSessionStatus('unsupported');
      return;
    }

    if (user) {
      void loadCourses('silent');
    }
  }, [classroomSupported, loadCourses, user]);

  const openCourse = useCallback(
    async (course: ClassroomCourse) => {
      if (!user || !classroomSupported) {
        setSessionStatus(classroomSupported ? 'idle' : 'unsupported');
        return;
      }
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
    [classroomSupported, resolveToken, user]
  );

  const reconnect = useCallback(async () => {
    if (!classroomSupported) {
      setSessionStatus('unsupported');
      return;
    }
    await loadCourses('interactive');
  }, [classroomSupported, loadCourses]);

  return {
    courses,
    coursework,
    loadingCourses,
    loadingWork,
    error,
    sessionStatus,
    classroomSupported,
    loadCourses,
    openCourse,
    reconnect
  };
}

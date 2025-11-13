import { getGoogleAccessAndProfile } from '../auth/google';

async function requestWithRetry<T>(url: string, accessToken?: string): Promise<T> {
  const ensureToken = async () => {
    if (accessToken) return accessToken;
    const auth = await getGoogleAccessAndProfile();
    return auth.accessToken;
  };

  let token = await ensureToken();
  let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (response.status === 401) {
    const refreshed = await getGoogleAccessAndProfile();
    token = refreshed.accessToken;
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }

  if (!response.ok) {
    throw new Error(`Classroom request failed with status ${response.status}`);
  }

  return response.json();
}

export type ClassroomCourse = {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
};

export type ClassroomCoursework = {
  id: string;
  title: string;
  state?: string;
  dueDate?: { year: number; month: number; day: number };
  alternateLink?: string;
};

export async function listCourses(accessToken?: string): Promise<ClassroomCourse[]> {
  const response = await requestWithRetry<{ courses?: ClassroomCourse[] }>(
    'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE',
    accessToken
  );
  return response.courses ?? [];
}

export async function listCoursework(courseId: string, accessToken?: string): Promise<ClassroomCoursework[]> {
  if (!courseId) return [];
  const response = await requestWithRetry<{ courseWork?: ClassroomCoursework[] }>(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
    accessToken
  );
  return response.courseWork ?? [];
}

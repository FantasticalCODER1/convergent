import { getGoogleAccessAndProfile } from '../auth/google';

async function withRetry(url: string) {
  let { accessToken } = await getGoogleAccessAndProfile();
  let r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (r.status === 401) {
    ({ accessToken } = await getGoogleAccessAndProfile());
    r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  }
  if (!r.ok) throw new Error(`Classroom fetch failed: ${r.status}`);
  return r.json();
}

export async function listCourses() { return (await withRetry('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE')).courses || []; }
export async function listCoursework(courseId: string) { return (await withRetry(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`)).courseWork || []; }

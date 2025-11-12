export async function fetchCourses(accessToken: string) {
  const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch courses');
  }
  const json = await res.json();
  return json.courses || [];
}

export async function fetchCoursework(accessToken: string, courseId: string) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch coursework');
  }
  const json = await res.json();
  return json.courseWork || [];
}

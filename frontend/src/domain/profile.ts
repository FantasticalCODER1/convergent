import type { AppUser } from '../types/User';

export const PROFILE_GRADE_PLACEHOLDER = 'For example: 9, 10, IB1';
export const PROFILE_SECTION_PLACEHOLDER = 'For example: S2';

export function buildScheduleAudienceKey(input: { grade?: string | null; section?: string | null }) {
  const grade = String(input.grade ?? '').trim().toUpperCase();
  const section = String(input.section ?? '').trim().toUpperCase();
  if (!grade && !section) return '';
  if (!grade) return `SECTION:${section}`;
  if (!section) return `GRADE:${grade}`;
  return `GRADE:${grade}__SECTION:${section}`;
}

export function isProfileComplete(user?: Pick<AppUser, 'grade' | 'section'> | null) {
  return !!String(user?.grade ?? '').trim() && !!String(user?.section ?? '').trim();
}

export function getProfileCompletionLabel(user?: Pick<AppUser, 'grade' | 'section'> | null) {
  if (isProfileComplete(user)) {
    return `${String(user?.grade).trim()} · ${String(user?.section).trim()}`;
  }
  if (String(user?.grade ?? '').trim()) {
    return `Grade ${String(user?.grade).trim()} · Section needed`;
  }
  return 'Profile incomplete';
}

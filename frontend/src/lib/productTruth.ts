import type { AppUser } from '../types/User';

export function shouldUseStudentClubPlaceholder(user?: Pick<AppUser, 'role'> | null) {
  return user?.role === 'student';
}

export const STUDENT_CLUB_PLACEHOLDER = {
  title: 'Club directory not published yet',
  body:
    'Club discovery will open when the school directory is published. Calendar, classes, and certificates remain available.'
} as const;

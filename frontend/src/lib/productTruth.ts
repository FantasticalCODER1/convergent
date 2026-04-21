import type { AppUser } from '../types/User';

export function shouldUseStudentClubPlaceholder(user?: Pick<AppUser, 'role'> | null) {
  return user?.role === 'student';
}

export const STUDENT_CLUB_PLACEHOLDER = {
  title: 'Clubs are not live for students yet',
  body:
    'The student club directory is intentionally held in placeholder mode until real school club data replaces the remaining development fixtures. Calendar, classes, and certificates stay live.'
} as const;

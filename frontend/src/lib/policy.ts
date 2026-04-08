import type { UserRole } from '../types/User';

export const ALLOWED_EMAIL_DOMAIN = '@doonschool.com';

export function normalizeUserRole(role?: string | null): UserRole {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'master':
    case 'teacher':
      return 'master';
    default:
      return 'student';
  }
}

export function isAllowedSchoolEmail(email?: string | null): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export function canAccessRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (requiredRole === 'student') return true;
  if (userRole === 'admin') return true;
  return userRole === requiredRole;
}

export function canManageClub(
  user: { id: string; role: UserRole } | null | undefined,
  club: { managerIds?: string[] } | null | undefined
): boolean {
  if (!user || !club) return false;
  if (user.role === 'admin') return true;
  if (!['manager', 'master'].includes(user.role)) return false;
  return (club.managerIds ?? []).includes(user.id);
}

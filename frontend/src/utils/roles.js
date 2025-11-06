/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Role definitions and helper utilities for permission checks across the UI.
// TODO: Sync with backend claims and expose analytics-tier permissions dynamically.

export const ROLES = {
  STUDENT: 'student',
  MANAGER: 'manager',
  MASTER: 'master',
  ADMIN: 'admin'
};

export const ROLE_LABELS = {
  [ROLES.STUDENT]: 'Student',
  [ROLES.MANAGER]: 'Boy-in-Charge',
  [ROLES.MASTER]: 'Master-in-Charge',
  [ROLES.ADMIN]: 'Administrator'
};

const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: ['view'],
  [ROLES.MANAGER]: ['view', 'post', 'attendance'],
  [ROLES.MASTER]: ['view', 'post', 'attendance', 'certify'],
  [ROLES.ADMIN]: ['all']
};

export function hasPermission(role, permission) {
  const normalizedRole = role ?? ROLES.STUDENT;
  const permissions = ROLE_PERMISSIONS[normalizedRole] ?? [];
  return permissions.includes('all') || permissions.includes(permission);
}

export function hasAnyPermission(role, permissionsToCheck = []) {
  return permissionsToCheck.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role, permissionsToCheck = []) {
  return permissionsToCheck.every((permission) => hasPermission(role, permission));
}

export function isAdmin(role) {
  return hasPermission(role, 'all');
}

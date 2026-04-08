import test from 'node:test';
import assert from 'node:assert/strict';

const { ALLOWED_EMAIL_DOMAIN, canAccessRole, canManageClub, isAllowedSchoolEmail, normalizeUserRole } = await import(
  '../frontend/src/lib/policy.ts'
);

test('school email policy only allows Doon School addresses', () => {
  assert.equal(ALLOWED_EMAIL_DOMAIN, '@doonschool.com');
  assert.equal(isAllowedSchoolEmail('student@doonschool.com'), true);
  assert.equal(isAllowedSchoolEmail('student@example.com'), false);
});

test('legacy teacher role normalizes to master', () => {
  assert.equal(normalizeUserRole('teacher'), 'master');
  assert.equal(normalizeUserRole('master'), 'master');
  assert.equal(normalizeUserRole('unknown'), 'student');
});

test('role guard preserves admin override only', () => {
  assert.equal(canAccessRole('admin', 'master'), true);
  assert.equal(canAccessRole('master', 'admin'), false);
  assert.equal(canAccessRole('manager', 'manager'), true);
  assert.equal(canAccessRole('manager', 'master'), false);
});

test('club management guard stays club-scoped for manager and master', () => {
  assert.equal(canManageClub({ id: 'a', role: 'admin' }, { managerIds: [] }), true);
  assert.equal(canManageClub({ id: 'a', role: 'manager' }, { managerIds: ['a'] }), true);
  assert.equal(canManageClub({ id: 'a', role: 'master' }, { managerIds: ['a'] }), true);
  assert.equal(canManageClub({ id: 'a', role: 'manager' }, { managerIds: ['b'] }), false);
  assert.equal(canManageClub({ id: 'a', role: 'student' }, { managerIds: ['a'] }), false);
});

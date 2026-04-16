import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { mapEventData, mapPostData, mapMembershipData } = await import('../frontend/src/services/recordMappers.ts');
const { composePersonalCalendar, getItemsForDay } = await import('../frontend/src/services/personalCalendarService.ts');

test('frontend certificate verification uses callable Functions instead of public Firestore queries', () => {
  const service = readFileSync(new URL('../frontend/src/services/certificatesService.ts', import.meta.url), 'utf8');
  assert.match(service, /callFunction<\{ code: string \}, CertificateRecord \| null>\('verifyCertificate'/);
  assert.doesNotMatch(service, /where\(.*verifierId/);
});

test('frontend role updates use callable Functions instead of direct Firestore updates', () => {
  const service = readFileSync(new URL('../frontend/src/services/usersService.ts', import.meta.url), 'utf8');
  assert.match(service, /callFunction<\{ id: string; role: UserRole \}, \{ ok: true \}>\('updateUserRole'/);
});

test('membership, RSVP, and import writes use callable Functions for privileged state changes', () => {
  const clubsService = readFileSync(new URL('../frontend/src/services/clubsService.ts', import.meta.url), 'utf8');
  const eventsService = readFileSync(new URL('../frontend/src/services/eventsService.ts', import.meta.url), 'utf8');
  assert.match(clubsService, /'setClubMembership'/);
  assert.match(clubsService, /'createClubPost'/);
  assert.match(clubsService, /'saveClubMetadata'/);
  assert.doesNotMatch(clubsService, /addDoc\(.*posts/);
  assert.doesNotMatch(clubsService, /setDoc\(/);
  assert.match(eventsService, /'setEventRsvp'/);
  assert.match(eventsService, /'applyEventImport'/);
});

test('routes are lazy-loaded to reduce the primary bundle', () => {
  const app = readFileSync(new URL('../frontend/src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /const CalendarPage = lazy/);
  assert.match(app, /const Certificates = lazy/);
  assert.match(app, /Suspense fallback=/);
});

test('legacy event mapping preserves school-wide visibility and author fallbacks', () => {
  const schoolEvent = mapEventData('school-1', {
    title: 'Imported assembly',
    type: 'school',
    source: 'school_calendar',
    sourceId: 'legacy-school'
  });
  assert.equal(schoolEvent.scope, 'school');
  assert.equal(schoolEvent.visibility, 'school');

  const groupEvent = mapEventData('group-1', {
    title: 'Club meeting',
    clubId: 'club-alpha',
    type: 'club',
    authorId: 'manager-1',
    authorName: 'Manager Legacy',
    authorEmail: 'manager@doonschool.com',
    authorRole: 'manager'
  });
  assert.equal(groupEvent.scope, 'group');
  assert.equal(groupEvent.visibility, 'members');
  assert.equal(groupEvent.createdByNameSnapshot, 'Manager Legacy');
  assert.equal(groupEvent.createdByEmailSnapshot, 'manager@doonschool.com');
});

test('legacy post and membership mapping keep author and approval-safe fallbacks', () => {
  const post = mapPostData('post-1', {
    text: 'Legacy content body',
    authorId: 'author-1',
    authorName: 'Legacy Author'
  }, 'club-alpha');
  assert.equal(post.content, 'Legacy content body');
  assert.equal(post.relatedGroupId, 'club-alpha');
  assert.equal(post.postedByNameSnapshot, 'Legacy Author');

  const membership = mapMembershipData('student-1', {
    joinedAt: '2026-04-10T08:00:00.000Z'
  }, 'club-alpha');
  assert.equal(membership.userId, 'student-1');
  assert.equal(membership.groupId, 'club-alpha');
  assert.equal(membership.status, 'approved');
});

test('personal calendar keeps overnight items on the following day and condenses schedule readiness safely', () => {
  const start = new Date('2026-04-14T00:00:00.000Z');
  const end = new Date('2026-04-16T00:00:00.000Z');
  const overnightEvent = mapEventData('overnight', {
    title: 'Overnight trip',
    startTime: '2026-04-14T23:00:00.000Z',
    endTime: '2026-04-15T07:00:00.000Z',
    type: 'school'
  });

  const calendar = composePersonalCalendar({
    clubs: [],
    events: [overnightEvent],
    scheduleEntries: [],
    scheduleDatasets: [],
    membershipMap: {},
    rangeStart: start,
    rangeEnd: end,
    user: {
      id: 'student-1',
      name: 'Student',
      email: 'student@doonschool.com',
      role: 'student',
      clubsJoined: []
    }
  });

  const secondDayItems = getItemsForDay(calendar.items, new Date('2026-04-15T12:00:00.000Z'));
  assert.equal(secondDayItems.length, 1);
  assert.equal(secondDayItems[0].title, 'Overnight trip');
  assert.equal(calendar.readiness.academicStatus, 'missing');
  assert.equal(calendar.readiness.mealStatus, 'missing');
});

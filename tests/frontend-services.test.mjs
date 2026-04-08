import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  assert.match(eventsService, /'setEventRsvp'/);
  assert.match(eventsService, /'applyEventImport'/);
});

test('routes are lazy-loaded to reduce the primary bundle', () => {
  const app = readFileSync(new URL('../frontend/src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /const CalendarPage = lazy/);
  assert.match(app, /const Certificates = lazy/);
  assert.match(app, /Suspense fallback=/);
});

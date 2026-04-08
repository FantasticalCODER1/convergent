const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('backend verification and issuance are Function-backed', () => {
  const functionsFile = readFileSync(path.join(root, 'backend/functions/index.js'), 'utf8');
  assert.match(functionsFile, /exports\.verifyCertificate = functions\.https\.onCall/);
  assert.match(functionsFile, /where\('verifierId', '==', code\)/);
  assert.match(functionsFile, /exports\.updateUserRole = functions\.https\.onCall/);
  assert.match(functionsFile, /exports\.issueCertificate = functions\.https\.onCall/);
  assert.match(functionsFile, /exports\.applyEventImport = functions\.https\.onCall/);
  assert.match(functionsFile, /exports\.setClubMembership = functions\.https\.onCall/);
  assert.match(functionsFile, /exports\.setEventRsvp = functions\.https\.onCall/);
});

test('firestore rules and indexes target the live schema', () => {
  const rules = readFileSync(path.join(root, 'backend/firestore.rules'), 'utf8');
  const indexes = readFileSync(path.join(root, 'backend/firestore.indexes.json'), 'utf8');
  assert.match(rules, /match \/clubs\/\{clubId\}/);
  assert.match(rules, /match \/memberships\/\{userId\}/);
  assert.match(rules, /match \/posts\/\{postId\}/);
  assert.match(rules, /match \/eventRsvps\/\{rsvpId\}/);
  assert.match(indexes, /"startTime"/);
  assert.match(indexes, /"userId"/);
  assert.match(indexes, /"verifierId"/);
});

test('storage rules are present for certificate uploads', () => {
  const storageRules = readFileSync(path.join(root, 'backend/storage.rules'), 'utf8');
  assert.match(storageRules, /match \/certificates\/\{clubId\}\/\{userId\}\/\{fileName\}/);
  assert.match(storageRules, /allow write/);
});

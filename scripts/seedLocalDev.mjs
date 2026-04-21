#!/usr/bin/env node
import { readFile } from 'fs/promises';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const projectId = 'demo-convergent';

process.env.GCLOUD_PROJECT = projectId;
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';

const users = [
  { uid: 'admin-user', email: 'admin@doonschool.com', password: 'password123', name: 'Admin User', role: 'admin' },
  { uid: 'master-user', email: 'master@doonschool.com', password: 'password123', name: 'Master User', role: 'master' },
  { uid: 'manager-user', email: 'manager@doonschool.com', password: 'password123', name: 'Manager User', role: 'manager' },
  { uid: 'student-user', email: 'student@doonschool.com', password: 'password123', name: 'Sumer Singh Gill', role: 'student', grade: 'S-Form', section: 'IB' }
];

function waitForPort(port, host = '127.0.0.1', timeoutMs = 60_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 750);
      });
    };
    tryConnect();
  });
}

async function ensureAuthUser(auth, user) {
  try {
    await auth.getUser(user.uid);
    await auth.updateUser(user.uid, {
      email: user.email,
      password: user.password,
      displayName: user.name
    });
  } catch {
    await auth.createUser({
      uid: user.uid,
      email: user.email,
      password: user.password,
      displayName: user.name
    });
  }
}

async function wipeCollection(db, collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  await Promise.all(snapshot.docs.map((doc) => db.recursiveDelete(doc.ref)));
}

async function seedUsers(db) {
  await wipeCollection(db, 'users');
  const batch = db.batch();

  for (const user of users) {
    batch.set(db.doc(`users/${user.uid}`), {
      name: user.name,
      email: user.email,
      role: user.role,
      clubsJoined: [],
      grade: user.grade ?? null,
      section: user.section ?? null,
      house: null,
      residency: null,
      scheduleAudienceKey: user.grade && user.section ? `${user.grade.toLowerCase()}::${user.section.toLowerCase()}` : null,
      authProvider: 'password',
      profileCompletedAt: user.grade && user.section ? FieldValue.serverTimestamp() : null,
      photoURL: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
}

async function seedSchedules(db) {
  await wipeCollection(db, 'scheduleEntries');
  await wipeCollection(db, 'scheduleDatasets');

  const scheduleEntriesPath = path.join(rootDir, 'data', 'calendar', 'datasets', '2026_spring_s_form', 'schedule_entries.json');
  const entries = JSON.parse(await readFile(scheduleEntriesPath, 'utf8'));

  const academicDatasetRef = db.doc('scheduleDatasets/spring_2026_s_form_academic');
  const mealDatasetRef = db.doc('scheduleDatasets/spring_2026_s_form_meals');

  await academicDatasetRef.set({
    scheduleType: 'academic',
    title: 'Spring 2026 S-Form timetable',
    audienceLabel: 'S-Form · IB',
    status: 'ready',
    sourceDataset: '2026_spring_s_form',
    notes: 'Derived from the attached April 2026 timetable and used as the local calendar source of truth.',
    updatedAt: FieldValue.serverTimestamp()
  });

  await mealDatasetRef.set({
    scheduleType: 'meal',
    title: 'Spring 2026 S-Form meals',
    audienceLabel: 'S-Form · IB',
    status: 'ready',
    sourceDataset: '2026_spring_s_form',
    notes: 'Breakfast, break, and lunch blocks derived from the same attached April 2026 timetable.',
    updatedAt: FieldValue.serverTimestamp()
  });

  const batch = db.batch();
  for (const entry of entries) {
    batch.set(db.doc(`scheduleEntries/${entry.id}`), {
      ...entry,
      createdAt: Timestamp.fromDate(new Date('2026-04-01T00:00:00.000Z')),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  await batch.commit();
}

async function clearStudentFacingCollections(db) {
  await wipeCollection(db, 'clubs');
  await wipeCollection(db, 'events');
  await wipeCollection(db, 'eventRsvps');
  await wipeCollection(db, 'certificates');
}

async function main() {
  await Promise.all([waitForPort(9099), waitForPort(8080), waitForPort(5001)]);

  const app =
    getApps()[0] ||
    initializeApp({
      projectId,
      storageBucket: `${projectId}.appspot.com`
    });

  const auth = getAuth(app);
  const db = getFirestore(app);

  await Promise.all(users.map((user) => ensureAuthUser(auth, user)));
  await clearStudentFacingCollections(db);
  await seedUsers(db);
  await seedSchedules(db);

  console.log('[seed] Local emulator data ready.');
}

main().catch((error) => {
  console.error('[seed] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

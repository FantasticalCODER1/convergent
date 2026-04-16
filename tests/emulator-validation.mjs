import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';

const frontendRequire = createRequire(new URL('../frontend/package.json', import.meta.url));
const {
  initializeApp,
  deleteApp
} = await import(frontendRequire.resolve('firebase/app'));
const {
  connectAuthEmulator,
  inMemoryPersistence,
  initializeAuth,
  signInWithEmailAndPassword
} = await import(frontendRequire.resolve('firebase/auth'));
const {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} = await import(frontendRequire.resolve('firebase/firestore'));
const {
  connectStorageEmulator,
  getStorage,
  ref,
  uploadBytes
} = await import(frontendRequire.resolve('firebase/storage'));
const {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable
} = await import(frontendRequire.resolve('firebase/functions'));

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-convergent';
const PASSWORD = 'password123';
const FIREBASE_CONFIG = {
  apiKey: 'demo-api-key',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.appspot.com`,
  appId: '1:000000000000:web:demo-convergent'
};
const EMULATOR_HOSTS = {
  auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099',
  firestore: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
  functions: process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001',
  storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'
};

const USERS = {
  admin: { uid: 'admin-user', email: 'admin@doonschool.com', role: 'admin', name: 'Admin User' },
  master: { uid: 'master-user', email: 'master@doonschool.com', role: 'master', name: 'Master User' },
  manager: { uid: 'manager-user', email: 'manager@doonschool.com', role: 'manager', name: 'Manager User' },
  student: { uid: 'student-user', email: 'student@doonschool.com', role: 'student', name: 'Student User' },
  outsider: { uid: 'outsider-user', email: 'outsider@example.com', role: 'student', name: 'Outsider User' },
  sync: { uid: 'sync-user', email: 'sync@doonschool.com', role: 'student', name: 'Sync User' }
};

const CLUBS = {
  alpha: { id: 'club-alpha', name: 'Alpha Club', managerIds: [USERS.manager.uid, USERS.master.uid] },
  beta: { id: 'club-beta', name: 'Beta Club', managerIds: [] },
  gamma: { id: 'club-gamma', name: 'Gamma Club', managerIds: [USERS.manager.uid] }
};

const clientApps = [];
let adminDb;
let adminAuth;

function permissionDenied(error) {
  return /permission-denied|insufficient permissions|permission denied|unauthorized/i.test(String(error?.code || '')) ||
    /permission-denied|insufficient permissions|permission denied|unauthorized/i.test(String(error?.message || ''));
}

async function expectPermissionDenied(promise) {
  await assert.rejects(promise, (error) => permissionDenied(error));
}

function makeProfile(uid, email, role = 'student', overrides = {}) {
  return {
    name: overrides.name || 'Test User',
    email,
    role,
    clubsJoined: overrides.clubsJoined || [],
    photoURL: null,
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  };
}

async function createClientSession(label, email, password = PASSWORD) {
  const app = initializeApp(FIREBASE_CONFIG, `emulator-${label}-${Date.now()}`);
  clientApps.push(app);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, `http://${EMULATOR_HOSTS.auth}`, { disableWarnings: true });

  const firestore = getFirestore(app);
  const [firestoreHost, firestorePort] = EMULATOR_HOSTS.firestore.split(':');
  connectFirestoreEmulator(firestore, firestoreHost, Number(firestorePort));

  const storage = getStorage(app);
  const [storageHost, storagePort] = EMULATOR_HOSTS.storage.split(':');
  connectStorageEmulator(storage, storageHost, Number(storagePort));

  const functions = getFunctions(app);
  const [functionsHost, functionsPort] = EMULATOR_HOSTS.functions.split(':');
  connectFunctionsEmulator(functions, functionsHost, Number(functionsPort));

  await signInWithEmailAndPassword(auth, email, password);

  return {
    app,
    auth,
    firestore,
    storage,
    functions,
    call(name, payload) {
      return httpsCallable(functions, name)(payload).then((response) => response.data);
    }
  };
}

async function createPublicFunctionsClient(label) {
  const app = initializeApp(FIREBASE_CONFIG, `public-${label}-${Date.now()}`);
  clientApps.push(app);
  const functions = getFunctions(app);
  const [functionsHost, functionsPort] = EMULATOR_HOSTS.functions.split(':');
  connectFunctionsEmulator(functions, functionsHost, Number(functionsPort));
  return {
    call(name, payload) {
      return httpsCallable(functions, name)(payload).then((response) => response.data);
    }
  };
}

before(async () => {
  const adminApp =
    getAdminApps()[0] ||
    initializeAdminApp({
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.appspot.com`
    });
  adminDb = getAdminFirestore(adminApp);
  adminAuth = getAdminAuth(adminApp);

  for (const user of Object.values(USERS)) {
    await adminAuth.createUser({
      uid: user.uid,
      email: user.email,
      password: PASSWORD,
      displayName: user.name
    });
  }

  await adminDb.doc(`users/${USERS.admin.uid}`).set({
    name: USERS.admin.name,
    email: USERS.admin.email,
    role: USERS.admin.role,
    clubsJoined: [],
    photoURL: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`users/${USERS.master.uid}`).set({
    name: USERS.master.name,
    email: USERS.master.email,
    role: USERS.master.role,
    clubsJoined: [CLUBS.alpha.id],
    photoURL: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`users/${USERS.manager.uid}`).set({
    name: USERS.manager.name,
    email: USERS.manager.email,
    role: USERS.manager.role,
    clubsJoined: [CLUBS.alpha.id],
    photoURL: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`users/${USERS.student.uid}`).set({
    name: USERS.student.name,
    email: USERS.student.email,
    role: USERS.student.role,
    clubsJoined: [],
    photoURL: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await adminDb.doc(`clubs/${CLUBS.alpha.id}`).set({
    name: CLUBS.alpha.name,
    description: 'Alpha club',
    category: 'Tech',
    mic: 'Teacher A',
    schedule: 'Wed 16:00',
    logoUrl: null,
    managerIds: CLUBS.alpha.managerIds,
    memberCount: 2,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`clubs/${CLUBS.beta.id}`).set({
    name: CLUBS.beta.name,
    description: 'Beta club',
    category: 'Service',
    mic: 'Teacher B',
    schedule: 'Thu 16:00',
    logoUrl: null,
    managerIds: [],
    memberCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`clubs/${CLUBS.gamma.id}`).set({
    name: CLUBS.gamma.name,
    description: 'Gamma private club',
    category: 'Tech',
    mic: 'Teacher C',
    schedule: 'Fri 17:00',
    visibility: 'private',
    membershipMode: 'approval_required',
    classroomLink: 'https://classroom.google.com/private',
    meetLink: 'https://meet.google.com/private-room',
    managerIds: CLUBS.gamma.managerIds,
    memberCount: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await adminDb.doc(`clubs/${CLUBS.alpha.id}/memberships/${USERS.manager.uid}`).set({
    userId: USERS.manager.uid,
    status: 'approved',
    joinedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`clubs/${CLUBS.alpha.id}/memberships/${USERS.student.uid}`).set({
    userId: USERS.student.uid,
    status: 'approved',
    joinedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`clubs/${CLUBS.gamma.id}/memberships/${USERS.manager.uid}`).set({
    userId: USERS.manager.uid,
    status: 'approved',
    joinedAt: FieldValue.serverTimestamp()
  });

  await adminDb.doc('events/event-seeded').set({
    title: 'Seeded Club Event',
    description: 'Existing event for RSVP tests',
    startTime: FieldValue.serverTimestamp(),
    endTime: FieldValue.serverTimestamp(),
    location: 'Auditorium',
    type: 'club',
    clubId: CLUBS.alpha.id,
    source: 'seed',
    sourceId: 'seeded-event',
    rsvpCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc('events/event-private').set({
    title: 'Private Club Event',
    description: 'Gamma only',
    startTime: FieldValue.serverTimestamp(),
    endTime: FieldValue.serverTimestamp(),
    type: 'club',
    clubId: CLUBS.gamma.id,
    relatedGroupId: CLUBS.gamma.id,
    visibility: 'members',
    attendanceEnabled: false,
    source: 'seed',
    sourceId: 'private-event',
    rsvpCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await adminDb.doc(`clubs/${CLUBS.gamma.id}/posts/private-post`).set({
    clubId: CLUBS.gamma.id,
    relatedGroupId: CLUBS.gamma.id,
    title: 'Private update',
    content: 'Gamma members only',
    visibility: 'members',
    postedByUid: USERS.manager.uid,
    postedByNameSnapshot: USERS.manager.name,
    postedByEmailSnapshot: USERS.manager.email,
    postedByRoleSnapshot: USERS.manager.role,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
});

after(async () => {
  await Promise.all(clientApps.map((app) => deleteApp(app)));
});

test('profile creation/sync respects doonschool restriction and preserves role on re-sync', async () => {
  const outsider = await createClientSession('outsider-profile', USERS.outsider.email);
  await expectPermissionDenied(
    setDoc(doc(outsider.firestore, 'users', USERS.outsider.uid), makeProfile(USERS.outsider.uid, USERS.outsider.email))
  );

  const syncUser = await createClientSession('sync-profile', USERS.sync.email);
  const syncRef = doc(syncUser.firestore, 'users', USERS.sync.uid);
  await setDoc(syncRef, makeProfile(USERS.sync.uid, USERS.sync.email, 'student', { name: USERS.sync.name }), { merge: true });

  const adminSession = await createClientSession('admin-profile', USERS.admin.email);
  await adminSession.call('updateUserRole', { id: USERS.sync.uid, role: 'master' });

  const existingRole = (await getDoc(syncRef)).data()?.role;
  await setDoc(
    syncRef,
    makeProfile(USERS.sync.uid, USERS.sync.email, existingRole, { name: 'Sync User Updated' }),
    { merge: true }
  );

  const finalRole = (await adminDb.doc(`users/${USERS.sync.uid}`).get()).data()?.role;
  assert.equal(finalRole, 'master');
});

test('role-protected event writes enforce club scope and admin-only school events', async () => {
  const manager = await createClientSession('manager-events', USERS.manager.email);
  const student = await createClientSession('student-events', USERS.student.email);
  const adminSession = await createClientSession('admin-events', USERS.admin.email);

  const managerEventRef = await addDoc(collection(manager.firestore, 'events'), {
    title: 'Manager Club Event',
    description: 'Allowed manager event',
    startTime: new Date('2026-04-09T10:00:00.000Z'),
    endTime: new Date('2026-04-09T11:00:00.000Z'),
    location: 'Club Room',
    type: 'club',
    clubId: CLUBS.alpha.id,
    source: 'manual',
    sourceId: 'manager-club-event',
    rsvpCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(manager.firestore, 'events', managerEventRef.id), {
    title: 'Manager Club Event Updated',
    updatedAt: serverTimestamp()
  });

  await expectPermissionDenied(
    addDoc(collection(manager.firestore, 'events'), {
      title: 'Other Club Event',
      startTime: new Date('2026-04-10T10:00:00.000Z'),
      endTime: new Date('2026-04-10T11:00:00.000Z'),
      type: 'club',
      clubId: CLUBS.beta.id,
      source: 'manual',
      sourceId: 'forbidden-other-club',
      rsvpCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );

  await expectPermissionDenied(
    addDoc(collection(manager.firestore, 'events'), {
      title: 'School Event By Manager',
      startTime: new Date('2026-04-10T10:00:00.000Z'),
      endTime: new Date('2026-04-10T11:00:00.000Z'),
      type: 'school',
      source: 'manual',
      sourceId: 'forbidden-school-event',
      rsvpCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );

  await expectPermissionDenied(
    addDoc(collection(student.firestore, 'events'), {
      title: 'Student Club Event',
      startTime: new Date('2026-04-10T10:00:00.000Z'),
      endTime: new Date('2026-04-10T11:00:00.000Z'),
      type: 'club',
      clubId: CLUBS.alpha.id,
      source: 'manual',
      sourceId: 'student-club-event',
      rsvpCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );

  const schoolEventRef = await addDoc(collection(adminSession.firestore, 'events'), {
    title: 'Admin School Event',
    startTime: new Date('2026-04-11T10:00:00.000Z'),
    endTime: new Date('2026-04-11T11:00:00.000Z'),
    type: 'school',
    source: 'manual',
    sourceId: 'admin-school-event',
    rsvpCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const schoolEvent = await getDoc(schoolEventRef);
  assert.equal(schoolEvent.data()?.type, 'school');
});

test('private club reads are blocked for non-members across clubs, posts, events, and memberships', async () => {
  const manager = await createClientSession('manager-private-reads', USERS.manager.email);
  const student = await createClientSession('student-private-reads', USERS.student.email);

  await expectPermissionDenied(getDoc(doc(student.firestore, 'clubs', CLUBS.gamma.id)));
  await expectPermissionDenied(getDoc(doc(student.firestore, `clubs/${CLUBS.gamma.id}/posts`, 'private-post')));
  await expectPermissionDenied(getDoc(doc(student.firestore, 'events', 'event-private')));
  await expectPermissionDenied(getDoc(doc(student.firestore, `clubs/${CLUBS.alpha.id}/memberships`, USERS.manager.uid)));

  assert.equal((await getDoc(doc(manager.firestore, 'clubs', CLUBS.gamma.id))).exists(), true);
  assert.equal((await getDoc(doc(manager.firestore, `clubs/${CLUBS.gamma.id}/posts`, 'private-post'))).exists(), true);
  assert.equal((await getDoc(doc(manager.firestore, 'events', 'event-private'))).exists(), true);
  assert.equal((await getDoc(doc(manager.firestore, `clubs/${CLUBS.gamma.id}/memberships`, USERS.manager.uid))).exists(), true);
});

test('club posts can only be published through the callable path', async () => {
  const manager = await createClientSession('manager-posts', USERS.manager.email);
  const student = await createClientSession('student-posts', USERS.student.email);

  await expectPermissionDenied(
    addDoc(collection(manager.firestore, `clubs/${CLUBS.alpha.id}/posts`), {
      clubId: CLUBS.alpha.id,
      relatedGroupId: CLUBS.alpha.id,
      title: 'Forged manager post',
      content: 'This should be rejected by rules.',
      authorId: USERS.manager.uid,
      postedByUid: USERS.manager.uid,
      visibility: 'members',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );

  const postOnly = await manager.call('createClubPost', {
    clubId: CLUBS.alpha.id,
    title: 'Manager post only',
    content: 'Standalone club update',
    category: 'club',
    visibility: 'members'
  });

  const linkedEventRef = await addDoc(collection(manager.firestore, 'events'), {
    title: 'Linked manager event',
    startTime: new Date('2026-04-12T10:00:00.000Z'),
    endTime: new Date('2026-04-12T11:00:00.000Z'),
    type: 'club',
    clubId: CLUBS.alpha.id,
    relatedGroupId: CLUBS.alpha.id,
    scope: 'group',
    visibility: 'members',
    source: 'manual',
    sourceId: 'linked-manager-event',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const linkedPost = await manager.call('createClubPost', {
    clubId: CLUBS.alpha.id,
    title: 'Linked manager post',
    content: 'Club update linked to an event',
    category: 'club',
    linkedEventId: linkedEventRef.id,
    visibility: 'members'
  });

  await expectPermissionDenied(
    student.call('createClubPost', {
      clubId: CLUBS.alpha.id,
      title: 'Student post',
      content: 'Nope'
    })
  );

  assert.equal((await getDoc(doc(manager.firestore, `clubs/${CLUBS.alpha.id}/posts`, postOnly.id))).exists(), true);
  assert.equal(linkedPost.linkedEventId, linkedEventRef.id);
});

test('club metadata writes are admin-owned except for the manager basics whitelist', async () => {
  const adminSession = await createClientSession('admin-club-metadata', USERS.admin.email);
  const manager = await createClientSession('manager-club-metadata', USERS.manager.email);

  await expectPermissionDenied(
    updateDoc(doc(manager.firestore, 'clubs', CLUBS.alpha.id), {
      description: 'Direct manager edit should fail.'
    })
  );

  const managerUpdate = await manager.call('saveClubMetadata', {
    id: CLUBS.alpha.id,
    description: 'Manager-safe description update.',
    schedule: 'Wed 17:00',
    meetingLocation: 'Library'
  });
  assert.equal(managerUpdate.description, 'Manager-safe description update.');
  assert.equal(managerUpdate.schedule, 'Wed 17:00');
  assert.equal(managerUpdate.meetingLocation, 'Library');
  assert.deepEqual(managerUpdate.managerIds, CLUBS.alpha.managerIds);

  await expectPermissionDenied(
    manager.call('saveClubMetadata', {
      id: CLUBS.alpha.id,
      description: 'Still okay',
      schedule: 'Wed 18:00',
      visibility: 'private'
    })
  );

  const adminUpdate = await adminSession.call('saveClubMetadata', {
    id: CLUBS.alpha.id,
    name: CLUBS.alpha.name,
    description: 'Admin-updated description.',
    category: 'club',
    groupType: 'club',
    mic: 'Teacher A',
    schedule: 'Wed 18:00',
    meetingLocation: 'Auditorium',
    classroomLink: 'https://classroom.google.com/admin-club',
    classroomCode: 'alpha-code',
    classroomCourseId: 'alpha-course',
    defaultMeetLink: 'https://meet.google.com/admin-alpha',
    resourceLinks: [{ label: 'Handbook', url: 'https://example.com/handbook', kind: 'resource' }],
    membershipMode: 'approval_required',
    visibility: 'members',
    managerIds: [USERS.manager.uid],
    memberCount: 7
  });
  assert.equal(adminUpdate.visibility, 'members');
  assert.equal(adminUpdate.memberCount, 7);
  assert.deepEqual(adminUpdate.managerIds, [USERS.manager.uid]);
});

test('club membership and RSVP callable flows update aggregate state end to end', async () => {
  const student = await createClientSession('student-membership', USERS.student.email);

  await student.call('setClubMembership', { clubId: CLUBS.beta.id, joined: true });
  const joinedMembership = await adminDb.doc(`clubs/${CLUBS.beta.id}/memberships/${USERS.student.uid}`).get();
  assert.equal(joinedMembership.exists, true);
  assert.equal((await adminDb.doc(`clubs/${CLUBS.beta.id}`).get()).data()?.memberCount, 1);

  await student.call('setClubMembership', { clubId: CLUBS.beta.id, joined: false });
  const removedMembership = await adminDb.doc(`clubs/${CLUBS.beta.id}/memberships/${USERS.student.uid}`).get();
  assert.equal(removedMembership.exists, false);
  assert.equal((await adminDb.doc(`clubs/${CLUBS.beta.id}`).get()).data()?.memberCount, 0);

  await student.call('setEventRsvp', { eventId: 'event-seeded', attending: true });
  const rsvpDoc = await adminDb.doc(`eventRsvps/event-seeded_${USERS.student.uid}`).get();
  assert.equal(rsvpDoc.exists, true);
  assert.equal((await adminDb.doc('events/event-seeded').get()).data()?.rsvpCount, 1);

  await student.call('setEventRsvp', { eventId: 'event-seeded', attending: false });
  assert.equal((await adminDb.doc(`eventRsvps/event-seeded_${USERS.student.uid}`).get()).exists, false);
  assert.equal((await adminDb.doc('events/event-seeded').get()).data()?.rsvpCount, 0);

  await expectPermissionDenied(student.call('setEventRsvp', { eventId: 'event-private', attending: true }));

  const manager = await createClientSession('manager-rsvp-disabled', USERS.manager.email);
  await assert.rejects(
    manager.call('setEventRsvp', { eventId: 'event-private', attending: true }),
    /failed-precondition|Attendance tracking is disabled/i
  );
});

test('certificate upload, issuance, and verification stay club-scoped', async () => {
  const manager = await createClientSession('manager-certificates', USERS.manager.email);
  const student = await createClientSession('student-certificates', USERS.student.email);
  const publicFunctions = await createPublicFunctionsClient('public-verify');

  const objectRef = ref(manager.storage, `certificates/${CLUBS.alpha.id}/${USERS.student.uid}/proof.txt`);
  await uploadBytes(objectRef, new Uint8Array([1, 2, 3]), { contentType: 'text/plain' });

  const forbiddenRef = ref(student.storage, `certificates/${CLUBS.alpha.id}/${USERS.student.uid}/proof.txt`);
  await expectPermissionDenied(uploadBytes(forbiddenRef, new Uint8Array([4, 5, 6]), { contentType: 'text/plain' }));

  const certificate = await manager.call('issueCertificate', {
    clubId: CLUBS.alpha.id,
    userId: USERS.student.uid,
    clubName: CLUBS.alpha.name,
    eventTitle: 'Alpha Showcase',
    storagePath: `certificates/${CLUBS.alpha.id}/${USERS.student.uid}/proof.txt`
  });

  assert.equal(certificate.clubId, CLUBS.alpha.id);
  assert.equal(certificate.userId, USERS.student.uid);

  await expectPermissionDenied(
    manager.call('issueCertificate', {
      clubId: CLUBS.beta.id,
      userId: USERS.student.uid,
      clubName: CLUBS.beta.name,
      eventTitle: 'Wrong Club',
      storagePath: `certificates/${CLUBS.beta.id}/${USERS.student.uid}/proof.txt`
    })
  );

  const verified = await publicFunctions.call('verifyCertificate', { code: certificate.verifierId });
  assert.equal(verified.verifierId, certificate.verifierId);
  assert.equal(verified.clubId, CLUBS.alpha.id);
});

test('role-protected functions and import apply are restricted and idempotent', async () => {
  const adminSession = await createClientSession('admin-functions', USERS.admin.email);
  const manager = await createClientSession('manager-import', USERS.manager.email);
  const student = await createClientSession('student-import', USERS.student.email);

  await expectPermissionDenied(student.call('updateUserRole', { id: USERS.student.uid, role: 'manager' }));

  const clubUsers = await manager.call('listClubUsers', { clubId: CLUBS.alpha.id });
  assert.ok(clubUsers.some((user) => user.id === USERS.student.uid));
  await expectPermissionDenied(student.call('listClubUsers', { clubId: CLUBS.alpha.id }));

  const firstImport = await manager.call('applyEventImport', {
    clubId: CLUBS.alpha.id,
    events: [
      {
        title: 'Import Event One',
        startTime: '2026-04-20T10:00:00.000Z',
        endTime: '2026-04-20T11:00:00.000Z',
        type: 'club',
        clubId: CLUBS.alpha.id,
        sourceId: 'import-alpha-1',
        source: 'admin-importer'
      },
      {
        title: 'Import Event Two',
        startTime: '2026-04-21T10:00:00.000Z',
        endTime: '2026-04-21T11:00:00.000Z',
        type: 'competition',
        clubId: CLUBS.alpha.id,
        sourceId: 'import-alpha-2',
        source: 'admin-importer'
      }
    ]
  });

  assert.equal(firstImport.created, 2);
  assert.equal(firstImport.updated, 0);

  const secondImport = await manager.call('applyEventImport', {
    clubId: CLUBS.alpha.id,
    events: [
      {
        title: 'Import Event One Updated',
        startTime: '2026-04-20T10:00:00.000Z',
        endTime: '2026-04-20T11:30:00.000Z',
        type: 'club',
        clubId: CLUBS.alpha.id,
        sourceId: 'import-alpha-1',
        source: 'admin-importer'
      }
    ]
  });

  assert.equal(secondImport.created, 0);
  assert.equal(secondImport.updated, 1);

  const importedEvents = await adminDb.collection('events').where('sourceId', '==', 'import-alpha-1').get();
  assert.equal(importedEvents.docs[0].data().title, 'Import Event One Updated');

  await expectPermissionDenied(
    manager.call('applyEventImport', {
      clubId: CLUBS.beta.id,
      events: [
        {
          title: 'Forbidden Import',
          startTime: '2026-04-22T10:00:00.000Z',
          endTime: '2026-04-22T11:00:00.000Z',
          type: 'club',
          clubId: CLUBS.beta.id,
          sourceId: 'forbidden-import',
          source: 'admin-importer'
        }
      ]
    })
  );

  const adminSchoolEvent = await adminSession.call('applyEventImport', {
    clubId: CLUBS.alpha.id,
    events: [
      {
        title: 'Admin Imported Club Event',
        startTime: '2026-04-23T10:00:00.000Z',
        endTime: '2026-04-23T11:00:00.000Z',
        type: 'club',
        clubId: CLUBS.alpha.id,
        sourceId: 'admin-import-club',
        source: 'admin-importer'
      }
    ]
  });
  assert.equal(adminSchoolEvent.created, 1);
});

test('reviewProposedCalendarChange applies approved event updates and logs rejected proposals without mutating events', async () => {
  const adminSession = await createClientSession('admin-review', USERS.admin.email);

  await adminDb.doc('events/review-event').set({
    title: 'Review pending event',
    startTime: new Date('2026-04-25T10:00:00.000Z'),
    endTime: new Date('2026-04-25T11:00:00.000Z'),
    type: 'school',
    visibility: 'school',
    source: 'manual',
    sourceId: 'review-event',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await adminDb.doc('proposedCalendarChanges/proposal-approve').set({
    sourceMessageId: 'msg-approve',
    sender: 'staff@doonschool.com',
    subject: 'Assembly moved later',
    receivedAt: FieldValue.serverTimestamp(),
    parsedType: 'calendar_update',
    affectedEventIds: ['review-event'],
    oldValues: { title: 'Review pending event' },
    proposedValues: {
      title: 'Reviewed event approved',
      location: 'Main Hall',
      classroomPostLink: 'https://classroom.google.com/c/post-approved'
    },
    confidence: 0.94,
    status: 'pending_review',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  const approvalResult = await adminSession.call('reviewProposedCalendarChange', {
    proposalId: 'proposal-approve',
    decision: 'approved'
  });
  assert.equal(approvalResult.status, 'approved');
  const approvedEvent = await adminDb.doc('events/review-event').get();
  assert.equal(approvedEvent.data()?.title, 'Reviewed event approved');
  assert.equal(approvedEvent.data()?.classroomPostLink, 'https://classroom.google.com/c/post-approved');
  assert.equal((await adminDb.doc('proposedCalendarChanges/proposal-approve').get()).data()?.status, 'approved');

  await adminDb.doc('events/reject-event').set({
    title: 'Reject me',
    startTime: new Date('2026-04-26T10:00:00.000Z'),
    endTime: new Date('2026-04-26T11:00:00.000Z'),
    type: 'school',
    visibility: 'school',
    source: 'manual',
    sourceId: 'reject-event',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await adminDb.doc('proposedCalendarChanges/proposal-reject').set({
    sourceMessageId: 'msg-reject',
    sender: 'staff@doonschool.com',
    subject: 'Do not apply this',
    receivedAt: FieldValue.serverTimestamp(),
    parsedType: 'calendar_update',
    affectedEventIds: ['reject-event'],
    oldValues: { title: 'Reject me' },
    proposedValues: { title: 'Should not change' },
    confidence: 0.51,
    status: 'pending_review',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  const rejectionResult = await adminSession.call('reviewProposedCalendarChange', {
    proposalId: 'proposal-reject',
    decision: 'rejected'
  });
  assert.equal(rejectionResult.status, 'rejected');
  const rejectedEvent = await adminDb.doc('events/reject-event').get();
  assert.equal(rejectedEvent.data()?.title, 'Reject me');
  assert.equal((await adminDb.doc('proposedCalendarChanges/proposal-reject').get()).data()?.status, 'rejected');

  const changeLogs = await adminDb.collection('changeLogs').get();
  const decisions = changeLogs.docs.map((docSnap) => docSnap.data().decision);
  assert.ok(decisions.includes('approved'));
  assert.ok(decisions.includes('rejected'));
});

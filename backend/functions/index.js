/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Firebase Cloud Functions entry point wiring callable handlers, auth triggers, and seed routines.
// TODO: Expand with scheduled tasks for weekly analytics rollups.

import functions from 'firebase-functions';
import admin from 'firebase-admin';
import { generateCertificate } from './generateCertificate.js';
import { attendanceWebhook } from './attendanceWebhook.js';
import { sampleClubs } from './sampleData.js';
import rolesMatrix from './roles.json' assert { type: 'json' };

admin.initializeApp();

const firestore = admin.firestore();
const { FieldValue } = admin.firestore;
const GOOGLE_DOMAIN = 'doonschool.com';
const DEFAULT_ROLE = 'student';
const VALID_ROLES = Object.keys(rolesMatrix);
let seedPromise;

async function ensureSampleData() {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const snapshot = await firestore.collection('clubs').limit(1).get();
    if (!snapshot.empty) {
      return;
    }

    const batch = firestore.batch();
    sampleClubs.forEach((club) => {
      const ref = firestore.collection('clubs').doc(club.slug);
      batch.set(ref, { ...club, createdAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();
  })().catch((error) => {
    console.error('Sample data seed failed', error);
    seedPromise = undefined;
  });

  return seedPromise;
}

async function applyRoleClaim(uid, role) {
  const normalizedRole = VALID_ROLES.includes(role) ? role : DEFAULT_ROLE;
  const userRecord = await admin.auth().getUser(uid);
  const existingClaims = userRecord.customClaims ?? {};

  if (existingClaims.role === normalizedRole) {
    return normalizedRole;
  }

  await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: normalizedRole });
  return normalizedRole;
}

async function upsertUserProfile(uid, payload) {
  const userRef = firestore.collection('users').doc(uid);
  await userRef.set(
    {
      updatedAt: FieldValue.serverTimestamp(),
      ...payload
    },
    { merge: true }
  );
}

export const onboardUser = functions.auth.user().onCreate(async (user) => {
  const { uid, email = '', displayName = '' } = user;
  const normalizedEmail = email.toLowerCase();

  if (!normalizedEmail.endsWith(`@${GOOGLE_DOMAIN}`)) {
    console.warn(`User ${uid} attempted signup with unauthorized domain: ${email}`);
    await admin.auth().deleteUser(uid);
    return;
  }

  const inferredRole = DEFAULT_ROLE;

  await applyRoleClaim(uid, inferredRole);
  await upsertUserProfile(uid, {
    uid,
    email: normalizedEmail,
    displayName,
    role: inferredRole,
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp()
  });
});

export const syncRoleClaims = functions.firestore.document('users/{userId}').onWrite(async (change, context) => {
  const { userId } = context.params;
  const afterData = change.after.exists ? change.after.data() : null;
  const desiredRole = afterData?.role;

  if (!desiredRole || !VALID_ROLES.includes(desiredRole)) {
    return null;
  }

  const currentRecord = await admin.auth().getUser(userId).catch((error) => {
    console.error('Unable to fetch user for role sync', userId, error);
    return null;
  });

  if (!currentRecord) {
    return null;
  }

  const currentRole = currentRecord.customClaims?.role;
  if (currentRole === desiredRole) {
    return null;
  }

  await admin.auth().setCustomUserClaims(userId, { ...(currentRecord.customClaims ?? {}), role: desiredRole });
  return null;
});

export const assignRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators can modify roles.');
  }

  const { uid, role } = data ?? {};
  if (!uid || typeof uid !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'A user id is required to assign a role.');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Role provided is not recognized.');
  }

  let normalizedRole;
  try {
    normalizedRole = await applyRoleClaim(uid, role);
  } catch (error) {
    console.error('Unable to assign role', uid, error);
    throw new functions.https.HttpsError('not-found', 'The requested user does not exist.');
  }
  await upsertUserProfile(uid, { role: normalizedRole });

  await firestore.collection('logs').add({
    type: 'role_change',
    userId: uid,
    role: normalizedRole,
    performedBy: context.auth.uid,
    createdAt: FieldValue.serverTimestamp()
  });

  return { success: true, role: normalizedRole };
});

export const refreshUserSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in to refresh your session.');
  }

  const { uid } = context.auth;
  const userRecord = await admin
    .auth()
    .getUser(uid)
    .catch((error) => {
      console.error('Unable to load user for session refresh', uid, error);
      throw new functions.https.HttpsError('internal', 'Unable to refresh your profile.');
    });

  const roleClaim = userRecord.customClaims?.role ?? DEFAULT_ROLE;

  await upsertUserProfile(uid, {
    uid,
    email: (userRecord.email ?? '').toLowerCase(),
    displayName: userRecord.displayName ?? 'Convergent Member',
    role: roleClaim,
    lastLoginAt: FieldValue.serverTimestamp()
  });

  return { role: roleClaim };
});

export const issueCertificate = functions.https.onCall(async (data, context) => {
  await ensureSampleData();
  return generateCertificate(data, context);
});

export const attendanceCheckIn = functions.https.onRequest(async (req, res) => {
  await ensureSampleData();
  return attendanceWebhook(req, res);
});

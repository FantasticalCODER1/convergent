/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Firebase Cloud Functions entry point wiring callable handlers and seeding sample data.
// TODO: Expand with scheduled tasks for weekly analytics rollups.

import functions from 'firebase-functions';
import admin from 'firebase-admin';
import { generateCertificate } from './generateCertificate.js';
import { attendanceWebhook } from './attendanceWebhook.js';
import { sampleClubs } from './sampleData.js';

admin.initializeApp();

const firestore = admin.firestore();
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
      batch.set(ref, { ...club, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
  })().catch((error) => {
    console.error('Sample data seed failed', error);
    seedPromise = undefined;
  });

  return seedPromise;
}

export const issueCertificate = functions.https.onCall(async (data, context) => {
  await ensureSampleData();
  return generateCertificate(data, context);
});

export const attendanceCheckIn = functions.https.onRequest(async (req, res) => {
  await ensureSampleData();
  return attendanceWebhook(req, res);
});

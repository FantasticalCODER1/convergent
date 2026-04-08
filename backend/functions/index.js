const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

admin.initializeApp();

const ALLOWED_EMAIL_DOMAIN = '@doonschool.com';
const USER_ROLES = ['student', 'manager', 'master', 'admin'];
const CLUB_MANAGER_ROLES = ['manager', 'master'];
const CERTIFICATE_ISSUER_ROLES = ['manager', 'master', 'admin'];
const EVENT_TYPES = ['club', 'school', 'competition'];

function normalizeRole(role) {
  if (role === 'teacher') return 'master';
  return USER_ROLES.includes(role) ? role : 'student';
}

function isAllowedSchoolEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function isClubScopedRole(role) {
  return CLUB_MANAGER_ROLES.includes(role);
}

function timestampToIso(value) {
  return value?.toDate ? value.toDate().toISOString() : value || undefined;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeRequiredString(value, field) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
  }
  return normalized;
}

function parseIsoDate(value, field) {
  const iso = normalizeRequiredString(value, field);
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a valid ISO timestamp.`);
  }
  return parsed;
}

async function getCallerContext(context) {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const authEmail = context.auth.token?.email;
  const email = authEmail || (await admin.auth().getUser(context.auth.uid)).email || '';
  if (!isAllowedSchoolEmail(email)) {
    throw new functions.https.HttpsError('permission-denied', 'Only @doonschool.com accounts are allowed.');
  }

  const userSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  const role = normalizeRole(userSnap.exists ? userSnap.data()?.role : 'student');
  return {
    uid: context.auth.uid,
    email,
    role,
    userRef: admin.firestore().doc(`users/${context.auth.uid}`)
  };
}

function assertRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient privileges.');
  }
}

async function getClubSnapshot(clubId) {
  const snap = await admin.firestore().doc(`clubs/${clubId}`).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Club not found.');
  }
  return snap;
}

async function assertClubAccess(caller, clubId) {
  if (caller.role === 'admin') {
    return getClubSnapshot(clubId);
  }
  if (!isClubScopedRole(caller.role)) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient privileges.');
  }

  const clubSnap = await getClubSnapshot(clubId);
  const managerIds = Array.isArray(clubSnap.data()?.managerIds) ? clubSnap.data().managerIds : [];
  if (!managerIds.includes(caller.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'You can only manage clubs assigned to you.');
  }
  return clubSnap;
}

function toAppUser(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    name: data.name || 'Student',
    email: data.email || '',
    role: normalizeRole(data.role),
    clubsJoined: Array.isArray(data.clubsJoined) ? data.clubsJoined : [],
    photoURL: data.photoURL || undefined,
    lastLoginAt: timestampToIso(data.lastLoginAt),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt)
  };
}

function toCertificateRecord(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    clubId: data.clubId,
    userId: data.userId,
    userName: data.userName,
    clubName: data.clubName,
    eventTitle: data.eventTitle,
    verifierId: data.verifierId,
    fileUrl: data.fileUrl || undefined,
    uploadedBy: data.uploadedBy || undefined,
    storagePath: data.storagePath || undefined,
    issuedAt: timestampToIso(data.issuedAt),
    createdAt: timestampToIso(data.createdAt)
  };
}

exports.verifyCertificate = functions.https.onCall(async (data) => {
  const code = String(data?.code || '').trim();
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'Certificate code is required.');
  }

  const snap = await admin.firestore().collection('certificates').where('verifierId', '==', code).limit(1).get();
  if (snap.empty) {
    return null;
  }

  return toCertificateRecord(snap.docs[0]);
});

exports.updateUserRole = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  assertRole(caller.role, ['admin']);

  const id = String(data?.id || '').trim();
  const role = normalizeRole(data?.role);
  if (!id || !USER_ROLES.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid user id and role are required.');
  }

  await admin.firestore().doc(`users/${id}`).set(
    {
      role,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { ok: true };
});

exports.listClubUsers = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  const clubSnap = await assertClubAccess(caller, clubId);

  const membershipSnap = await admin.firestore().collection(`clubs/${clubId}/memberships`).get();
  const memberIds = new Set([
    ...membershipSnap.docs.map((doc) => doc.id),
    ...(Array.isArray(clubSnap.data()?.managerIds) ? clubSnap.data().managerIds : [])
  ]);

  if (memberIds.size === 0) {
    return [];
  }

  const users = await Promise.all(
    Array.from(memberIds).map(async (uid) => {
      const snap = await admin.firestore().doc(`users/${uid}`).get();
      return snap.exists ? toAppUser(snap) : null;
    })
  );

  return users.filter(Boolean);
});

exports.setClubMembership = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  const joined = !!data?.joined;
  await getClubSnapshot(clubId);

  const membershipRef = admin.firestore().doc(`clubs/${clubId}/memberships/${caller.uid}`);
  const userRef = admin.firestore().doc(`users/${caller.uid}`);
  const clubRef = admin.firestore().doc(`clubs/${clubId}`);
  const membershipSnap = await membershipRef.get();
  const batch = admin.firestore().batch();

  if (joined) {
    if (!membershipSnap.exists) {
      batch.set(membershipRef, {
        userId: caller.uid,
        joinedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      batch.update(userRef, {
        clubsJoined: FieldValue.arrayUnion(clubId),
        updatedAt: FieldValue.serverTimestamp()
      });
      batch.update(clubRef, {
        memberCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  } else if (membershipSnap.exists) {
    batch.delete(membershipRef);
    batch.update(userRef, {
      clubsJoined: FieldValue.arrayRemove(clubId),
      updatedAt: FieldValue.serverTimestamp()
    });
    batch.update(clubRef, {
      memberCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  return { ok: true, joined };
});

exports.setEventRsvp = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const eventId = normalizeRequiredString(data?.eventId, 'eventId');
  const attending = !!data?.attending;

  const eventRef = admin.firestore().doc(`events/${eventId}`);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Event not found.');
  }

  const rsvpRef = admin.firestore().doc(`eventRsvps/${eventId}_${caller.uid}`);
  const existing = await rsvpRef.get();
  const existingAttending = !!existing.data()?.attending;
  const batch = admin.firestore().batch();

  if (attending) {
    batch.set(rsvpRef, {
      eventId,
      userId: caller.uid,
      attending: true,
      respondedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    if (!existing.exists || !existingAttending) {
      batch.update(eventRef, {
        rsvpCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  } else {
    if (existing.exists) {
      batch.delete(rsvpRef);
      if (existingAttending) {
        batch.update(eventRef, {
          rsvpCount: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }
  }

  await batch.commit();
  return { ok: true, attending };
});

exports.issueCertificate = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  assertRole(caller.role, CERTIFICATE_ISSUER_ROLES);

  const userId = normalizeRequiredString(data?.userId, 'userId');
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  const clubName = normalizeRequiredString(data?.clubName, 'clubName');
  const eventTitle = normalizeRequiredString(data?.eventTitle, 'eventTitle');
  const storagePath = normalizeOptionalString(data?.storagePath);
  const fileUrl = normalizeOptionalString(data?.fileUrl);

  await assertClubAccess(caller, clubId);

  if (storagePath && !storagePath.startsWith(`certificates/${clubId}/${userId}/`)) {
    throw new functions.https.HttpsError('invalid-argument', 'Certificate storage path does not match the selected club and user.');
  }

  const userSnap = await admin.firestore().doc(`users/${userId}`).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Recipient user not found.');
  }
  const userName = normalizeRequiredString(userSnap.data()?.name || data?.userName, 'userName');

  const verifierId = admin.firestore().collection('_ids').doc().id;
  const docRef = await admin.firestore().collection('certificates').add({
    clubId,
    userId,
    userName,
    clubName,
    eventTitle,
    verifierId,
    fileUrl,
    storagePath,
    uploadedBy: caller.uid,
    issuedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  });

  const snap = await docRef.get();
  return toCertificateRecord(snap);
});

function normalizeEventPayload(data, fallbackClubId) {
  const clubId = normalizeRequiredString(data?.clubId || fallbackClubId, 'clubId');
  const title = normalizeRequiredString(data?.title, 'title');
  const startTime = parseIsoDate(data?.startTime, 'startTime');
  const endTime = parseIsoDate(data?.endTime || data?.startTime, 'endTime');
  const sourceId = normalizeRequiredString(data?.sourceId, 'sourceId');
  const type = normalizeRequiredString(data?.type || 'club', 'type').toLowerCase();

  if (!EVENT_TYPES.includes(type)) {
    throw new functions.https.HttpsError('invalid-argument', 'Unsupported event type.');
  }

  return {
    title,
    description: normalizeOptionalString(data?.description),
    startTime,
    endTime,
    location: normalizeOptionalString(data?.location),
    type,
    clubId,
    source: normalizeOptionalString(data?.source) || 'admin-importer',
    sourceId
  };
}

async function upsertImportedEvent(payload) {
  const existing = await admin.firestore().collection('events').where('sourceId', '==', payload.sourceId).limit(1).get();
  const eventData = {
    title: payload.title,
    description: payload.description,
    startTime: Timestamp.fromDate(payload.startTime),
    endTime: Timestamp.fromDate(payload.endTime),
    location: payload.location,
    type: payload.type,
    clubId: payload.clubId,
    source: payload.source,
    sourceId: payload.sourceId,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    if (existingDoc.data()?.clubId !== payload.clubId) {
      throw new functions.https.HttpsError('failed-precondition', `sourceId ${payload.sourceId} is already assigned to another club.`);
    }
    await existingDoc.ref.update(eventData);
    return { id: existingDoc.id, status: 'updated' };
  }

  const ref = await admin.firestore().collection('events').add({
    ...eventData,
    rsvpCount: 0,
    createdAt: FieldValue.serverTimestamp()
  });
  return { id: ref.id, status: 'created' };
}

exports.applyEventImport = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  const rawEvents = Array.isArray(data?.events) ? data.events : null;
  if (!rawEvents) {
    throw new functions.https.HttpsError('invalid-argument', 'events must be an array.');
  }

  await assertClubAccess(caller, clubId);

  let created = 0;
  let updated = 0;
  const errors = [];

  for (let index = 0; index < rawEvents.length; index += 1) {
    try {
      const payload = normalizeEventPayload(rawEvents[index], clubId);
      const result = await upsertImportedEvent(payload);
      if (result.status === 'created') created += 1;
      if (result.status === 'updated') updated += 1;
    } catch (error) {
      const message =
        error instanceof functions.https.HttpsError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown import error.';
      errors.push({
        index,
        sourceId: rawEvents[index]?.sourceId || null,
        message
      });
    }
  }

  return {
    created,
    updated,
    skipped: errors.length,
    errors
  };
});

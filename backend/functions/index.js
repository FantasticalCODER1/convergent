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

function parseOptionalIsoDate(value, field) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return parseIsoDate(normalized, field);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter(Boolean);
}

function normalizeResourceLinks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const label = normalizeOptionalString(entry.label);
      const url = normalizeOptionalString(entry.url);
      const kind = normalizeOptionalString(entry.kind);
      if (!url) return null;
      return {
        label: label || 'Resource',
        url,
        kind: kind || 'resource'
      };
    })
    .filter(Boolean);
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
  const name = userSnap.exists ? userSnap.data()?.name || context.auth.token?.name || email : context.auth.token?.name || email;
  return {
    uid: context.auth.uid,
    name,
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
    grade: data.grade || undefined,
    section: data.section || undefined,
    house: data.house || undefined,
    residency: data.residency || undefined,
    scheduleAudienceKey: data.scheduleAudienceKey || undefined,
    authProvider: data.authProvider || undefined,
    profileCompletedAt: timestampToIso(data.profileCompletedAt),
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
    ...membershipSnap.docs
      .filter((doc) => {
        const status = doc.data()?.status;
        return !status || status === 'approved';
      })
      .map((doc) => doc.id),
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

exports.listClubCertificates = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  await assertClubAccess(caller, clubId);

  const snap = await admin.firestore().collection('certificates').where('clubId', '==', clubId).get();
  return snap.docs
    .map((doc) => toCertificateRecord(doc))
    .sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')));
});

exports.setClubMembership = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  const joined = !!data?.joined;
  const clubSnap = await getClubSnapshot(clubId);
  const membershipMode = clubSnap.data()?.membershipMode || 'open';

  const membershipRef = admin.firestore().doc(`clubs/${clubId}/memberships/${caller.uid}`);
  const userRef = admin.firestore().doc(`users/${caller.uid}`);
  const clubRef = admin.firestore().doc(`clubs/${clubId}`);
  const membershipSnap = await membershipRef.get();
  const existingStatus = membershipSnap.exists ? membershipSnap.data()?.status : null;
  const batch = admin.firestore().batch();

  if (joined) {
    if (membershipMode === 'invite_only') {
      throw new functions.https.HttpsError('permission-denied', 'This club is invite only.');
    }

    const membershipTimestamp = FieldValue.serverTimestamp();
    if (membershipMode === 'approval_required') {
      if (existingStatus !== 'approved' && (!membershipSnap.exists || existingStatus !== 'pending')) {
        batch.set(membershipRef, {
          userId: caller.uid,
          groupId: clubId,
          status: 'pending',
          memberRole: 'member',
          approvedBy: null,
          approvedAt: null,
          joinedAt: membershipSnap.exists ? membershipSnap.data()?.joinedAt || membershipTimestamp : membershipTimestamp,
          createdAt: membershipSnap.exists ? membershipSnap.data()?.createdAt || membershipTimestamp : membershipTimestamp,
          updatedAt: membershipTimestamp
        }, { merge: true });
      }
    } else if (!membershipSnap.exists || existingStatus !== 'approved') {
      batch.set(membershipRef, {
        userId: caller.uid,
        groupId: clubId,
        status: 'approved',
        memberRole: 'member',
        approvedBy: caller.uid,
        approvedAt: membershipTimestamp,
        joinedAt: membershipTimestamp,
        createdAt: membershipSnap.exists ? membershipSnap.data()?.createdAt || membershipTimestamp : membershipTimestamp,
        updatedAt: membershipTimestamp
      }, { merge: true });
      batch.set(userRef, {
        clubsJoined: FieldValue.arrayUnion(clubId),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      if (!membershipSnap.exists || existingStatus !== 'approved') {
        batch.update(clubRef, {
          memberCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }
  } else if (membershipSnap.exists) {
    batch.delete(membershipRef);
    if (existingStatus === 'approved') {
      batch.set(userRef, {
        clubsJoined: FieldValue.arrayRemove(clubId),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      batch.update(clubRef, {
        memberCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }

  await batch.commit();
  return {
    ok: true,
    joined,
    status: joined
      ? membershipMode === 'approval_required'
        ? existingStatus === 'approved' ? 'approved' : 'pending'
        : 'approved'
      : 'removed'
  };
});

exports.listClubMembershipRequests = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  await assertClubAccess(caller, clubId);

  const membershipSnap = await admin.firestore().collection(`clubs/${clubId}/memberships`).where('status', '==', 'pending').get();
  const requests = await Promise.all(
    membershipSnap.docs.map(async (membershipDoc) => {
      const membership = membershipDoc.data() || {};
      const userSnap = await admin.firestore().doc(`users/${membership.userId || membershipDoc.id}`).get();
      const user = userSnap.exists ? toAppUser(userSnap) : null;
      return {
        id: membershipDoc.id,
        userId: membership.userId || membershipDoc.id,
        groupId: membership.groupId || clubId,
        clubId,
        status: membership.status || 'pending',
        memberRole: membership.memberRole || 'member',
        approvedBy: membership.approvedBy || undefined,
        approvedAt: timestampToIso(membership.approvedAt),
        createdAt: timestampToIso(membership.createdAt),
        updatedAt: timestampToIso(membership.updatedAt),
        user
      };
    })
  );

  return requests.sort((a, b) => String(a.user?.name || '').localeCompare(String(b.user?.name || '')));
});

exports.setClubMembershipStatus = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  const userId = normalizeRequiredString(data?.userId, 'userId');
  const status = normalizeRequiredString(data?.status, 'status');
  if (!['approved', 'rejected'].includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'status must be approved or rejected.');
  }

  await assertClubAccess(caller, clubId);

  const membershipRef = admin.firestore().doc(`clubs/${clubId}/memberships/${userId}`);
  const membershipSnap = await membershipRef.get();
  if (!membershipSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Membership request not found.');
  }

  const existingStatus = membershipSnap.data()?.status || 'pending';
  const userRef = admin.firestore().doc(`users/${userId}`);
  const clubRef = admin.firestore().doc(`clubs/${clubId}`);
  const timestamp = FieldValue.serverTimestamp();
  const batch = admin.firestore().batch();

  batch.set(membershipRef, {
    status,
    memberRole: membershipSnap.data()?.memberRole || 'member',
    approvedBy: status === 'approved' ? caller.uid : null,
    approvedAt: status === 'approved' ? timestamp : null,
    updatedAt: timestamp
  }, { merge: true });

  if (status === 'approved' && existingStatus !== 'approved') {
    batch.set(userRef, {
      clubsJoined: FieldValue.arrayUnion(clubId),
      updatedAt: timestamp
    }, { merge: true });
    batch.update(clubRef, {
      memberCount: FieldValue.increment(1),
      updatedAt: timestamp
    });
  }

  if (status === 'rejected' && existingStatus === 'approved') {
    batch.set(userRef, {
      clubsJoined: FieldValue.arrayRemove(clubId),
      updatedAt: timestamp
    }, { merge: true });
    batch.update(clubRef, {
      memberCount: FieldValue.increment(-1),
      updatedAt: timestamp
    });
  }

  await batch.commit();
  return { ok: true, status };
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

exports.listEventAttendance = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const eventId = normalizeRequiredString(data?.eventId, 'eventId');
  const eventSnap = await admin.firestore().doc(`events/${eventId}`).get();
  if (!eventSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Event not found.');
  }

  const eventData = eventSnap.data() || {};
  const eventGroupId = eventData.relatedGroupId || eventData.clubId;
  if (eventGroupId) {
    await assertClubAccess(caller, eventGroupId);
  } else {
    assertRole(caller.role, ['admin']);
  }

  const rsvpSnap = await admin.firestore().collection('eventRsvps').where('eventId', '==', eventId).get();
  const attendees = await Promise.all(
    rsvpSnap.docs.map(async (doc) => {
      const record = doc.data() || {};
      const userSnap = await admin.firestore().doc(`users/${record.userId}`).get();
      const user = userSnap.exists ? toAppUser(userSnap) : null;
      return {
        userId: record.userId,
        name: user?.name || 'Member',
        email: user?.email || '',
        role: user?.role || 'student',
        respondedAt: timestampToIso(record.respondedAt)
      };
    })
  );

  return attendees.sort((a, b) => a.name.localeCompare(b.name));
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
  const clubId = normalizeRequiredString(data?.relatedGroupId || data?.clubId || fallbackClubId, 'clubId');
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
    category: normalizeOptionalString(data?.category) || 'club',
    scope: normalizeOptionalString(data?.scope) || 'group',
    allDay: !!data?.allDay,
    location: normalizeOptionalString(data?.location),
    classroomLink: normalizeOptionalString(data?.classroomLink),
    classroomCourseId: normalizeOptionalString(data?.classroomCourseId),
    classroomPostLink: normalizeOptionalString(data?.classroomPostLink),
    meetLink: normalizeOptionalString(data?.meetLink),
    resourceLinks: normalizeResourceLinks(data?.resourceLinks),
    attendanceEnabled: data?.attendanceEnabled !== false,
    visibility: normalizeOptionalString(data?.visibility) || 'members',
    type,
    relatedGroupId: clubId,
    clubId,
    source: normalizeOptionalString(data?.source) || 'admin-importer',
    sourceId,
    sourceDataset: normalizeOptionalString(data?.sourceMetadata?.sourceDataset || data?.sourceDataset),
    sourceTerm: normalizeOptionalString(data?.sourceMetadata?.sourceTerm || data?.sourceTerm),
    sourceHash: normalizeOptionalString(data?.sourceMetadata?.sourceHash || data?.sourceHash)
  };
}

async function upsertImportedEvent(payload, caller) {
  const existing = await admin.firestore().collection('events').where('sourceId', '==', payload.sourceId).limit(1).get();
  const eventData = {
    title: payload.title,
    description: payload.description,
    category: payload.category,
    scope: payload.scope,
    relatedGroupId: payload.relatedGroupId,
    startTime: Timestamp.fromDate(payload.startTime),
    endTime: Timestamp.fromDate(payload.endTime),
    allDay: payload.allDay,
    location: payload.location,
    classroomLink: payload.classroomLink,
    classroomCourseId: payload.classroomCourseId,
    classroomPostLink: payload.classroomPostLink,
    meetLink: payload.meetLink,
    resourceLinks: payload.resourceLinks,
    attendanceEnabled: payload.attendanceEnabled,
    visibility: payload.visibility,
    type: payload.type,
    clubId: payload.clubId,
    source: payload.source,
    sourceId: payload.sourceId,
    sourceDataset: payload.sourceDataset,
    sourceTerm: payload.sourceTerm,
    sourceHash: payload.sourceHash,
    sourceMetadata: {
      source: payload.source,
      sourceId: payload.sourceId,
      sourceDataset: payload.sourceDataset,
      sourceTerm: payload.sourceTerm,
      sourceHash: payload.sourceHash
    },
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
    createdByUid: caller.uid,
    createdByNameSnapshot: caller.name,
    createdByEmailSnapshot: caller.email,
    createdByRoleSnapshot: caller.role,
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
      const result = await upsertImportedEvent(payload, caller);
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

function buildReviewedEventUpdates(affectedEventIds, proposedValues) {
  const eventUpdates = proposedValues && typeof proposedValues.eventUpdates === 'object' && !Array.isArray(proposedValues.eventUpdates)
    ? proposedValues.eventUpdates
    : null;

  if (eventUpdates) {
    return Object.entries(eventUpdates)
      .filter(([eventId]) => !affectedEventIds.length || affectedEventIds.includes(eventId))
      .map(([eventId, values]) => ({ eventId, values }));
  }

  return affectedEventIds.map((eventId) => ({ eventId, values: proposedValues }));
}

function sanitizeSourceMetadata(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    source: normalizeOptionalString(value.source),
    sourceId: normalizeOptionalString(value.sourceId),
    sourceDataset: normalizeOptionalString(value.sourceDataset),
    sourceTerm: normalizeOptionalString(value.sourceTerm),
    sourceHash: normalizeOptionalString(value.sourceHash)
  };
}

function sanitizeEventUpdate(values) {
  if (!values || typeof values !== 'object') return {};

  const update = {};
  const assignString = (field) => {
    if (Object.prototype.hasOwnProperty.call(values, field)) {
      update[field] = normalizeOptionalString(values[field]);
    }
  };

  [
    'title',
    'description',
    'category',
    'scope',
    'location',
    'classroomLink',
    'classroomCourseId',
    'classroomPostLink',
    'meetLink',
    'visibility',
    'source',
    'sourceId',
    'sourceDataset',
    'sourceTerm',
    'sourceHash'
  ].forEach(assignString);

  if (Object.prototype.hasOwnProperty.call(values, 'allDay') && typeof values.allDay === 'boolean') {
    update.allDay = values.allDay;
  }
  if (Object.prototype.hasOwnProperty.call(values, 'attendanceEnabled') && typeof values.attendanceEnabled === 'boolean') {
    update.attendanceEnabled = values.attendanceEnabled;
  }
  if (Object.prototype.hasOwnProperty.call(values, 'resourceLinks')) {
    update.resourceLinks = normalizeResourceLinks(values.resourceLinks);
  }
  if (Object.prototype.hasOwnProperty.call(values, 'sourceMetadata')) {
    update.sourceMetadata = sanitizeSourceMetadata(values.sourceMetadata);
  }
  if (Object.prototype.hasOwnProperty.call(values, 'startTime')) {
    const parsed = parseOptionalIsoDate(values.startTime, 'startTime');
    update.startTime = parsed ? Timestamp.fromDate(parsed) : null;
  }
  if (Object.prototype.hasOwnProperty.call(values, 'endTime')) {
    const parsed = parseOptionalIsoDate(values.endTime, 'endTime');
    update.endTime = parsed ? Timestamp.fromDate(parsed) : null;
  }

  const relatedGroupId = Object.prototype.hasOwnProperty.call(values, 'relatedGroupId')
    ? normalizeOptionalString(values.relatedGroupId)
    : undefined;
  const clubId = Object.prototype.hasOwnProperty.call(values, 'clubId')
    ? normalizeOptionalString(values.clubId)
    : undefined;
  if (relatedGroupId !== undefined || clubId !== undefined) {
    const normalizedGroupId = relatedGroupId !== undefined ? relatedGroupId : clubId;
    update.relatedGroupId = normalizedGroupId;
    update.clubId = normalizedGroupId;
  }

  return update;
}

exports.reviewProposedCalendarChange = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  assertRole(caller.role, ['admin']);

  const proposalId = normalizeRequiredString(data?.proposalId, 'proposalId');
  const decision = normalizeRequiredString(data?.decision, 'decision');
  if (!['approved', 'rejected'].includes(decision)) {
    throw new functions.https.HttpsError('invalid-argument', 'decision must be approved or rejected.');
  }

  const proposalRef = admin.firestore().doc(`proposedCalendarChanges/${proposalId}`);
  const proposalSnap = await proposalRef.get();
  if (!proposalSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Proposed calendar change not found.');
  }

  const proposal = proposalSnap.data() || {};
  if (proposal.status && proposal.status !== 'pending_review') {
    throw new functions.https.HttpsError('failed-precondition', 'This proposal has already been reviewed.');
  }

  const affectedEventIds = normalizeStringArray(proposal.affectedEventIds);
  const proposedValues = proposal.proposedValues && typeof proposal.proposedValues === 'object' ? proposal.proposedValues : {};
  const batch = admin.firestore().batch();
  const reviewedAt = FieldValue.serverTimestamp();

  if (decision === 'approved') {
    const updates = buildReviewedEventUpdates(affectedEventIds, proposedValues);
    for (const { eventId, values } of updates) {
      const eventRef = admin.firestore().doc(`events/${eventId}`);
      const eventSnap = await eventRef.get();
      if (!eventSnap.exists) {
        throw new functions.https.HttpsError('not-found', `Affected event ${eventId} was not found.`);
      }
      batch.set(eventRef, {
        ...sanitizeEventUpdate(values),
        updatedAt: reviewedAt
      }, { merge: true });
    }
  }

  batch.set(proposalRef, {
    status: decision,
    reviewedBy: caller.uid,
    reviewedAt,
    updatedAt: reviewedAt
  }, { merge: true });

  const changeLogRef = admin.firestore().collection('changeLogs').doc();
  batch.set(changeLogRef, {
    proposalId,
    sourceMessageId: normalizeOptionalString(proposal.sourceMessageId),
    decision,
    sender: normalizeOptionalString(proposal.sender) || '',
    subject: normalizeOptionalString(proposal.subject) || '',
    affectedEventIds,
    oldValues: proposal.oldValues && typeof proposal.oldValues === 'object' ? proposal.oldValues : {},
    proposedValues,
    reviewedBy: caller.uid,
    reviewedAt,
    createdAt: reviewedAt
  });

  await batch.commit();
  return { ok: true, status: decision };
});

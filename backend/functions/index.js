const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

admin.initializeApp();

const ALLOWED_EMAIL_DOMAIN = '@doonschool.com';
const USER_ROLES = ['student', 'manager', 'master', 'admin'];
const CLUB_MANAGER_ROLES = ['manager', 'master'];
const CERTIFICATE_ISSUER_ROLES = ['manager', 'master', 'admin'];
const EVENT_TYPES = ['club', 'school', 'competition'];
const CLUB_VISIBILITIES = ['school', 'members', 'managers', 'private'];
const CLUB_MEMBERSHIP_MODES = ['open', 'approval_required', 'invite_only'];

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

function normalizeVisibility(value, fallback = 'school') {
  const normalized = normalizeOptionalString(value);
  return normalized && CLUB_VISIBILITIES.includes(normalized) ? normalized : fallback;
}

function normalizeMembershipMode(value) {
  const normalized = normalizeOptionalString(value);
  return normalized && CLUB_MEMBERSHIP_MODES.includes(normalized) ? normalized : 'open';
}

function normalizeNonNegativeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Expected a non-negative number.');
  }
  return numeric;
}

function normalizeClubGroupType(value) {
  const normalized = normalizeOptionalString(value);
  return normalized || 'club';
}

function approvedMembershipStatus(status) {
  return !status || status === 'approved';
}

function callerManagesClubData(caller, clubData) {
  if (caller.role === 'admin') return true;
  if (!isClubScopedRole(caller.role)) return false;
  return normalizeStringArray(clubData?.managerIds).includes(caller.uid);
}

function clubHasGatedContent(clubData) {
  return Boolean(
    normalizeOptionalString(clubData?.classroomLink)
    || normalizeOptionalString(clubData?.classroomCode)
    || normalizeOptionalString(clubData?.classroomCourseId)
    || normalizeOptionalString(clubData?.defaultMeetLink)
    || normalizeOptionalString(clubData?.meetLink)
    || normalizeResourceLinks(clubData?.resourceLinks).length > 0
  );
}

function getEventGroupId(data) {
  return normalizeOptionalString(data?.relatedGroupId) || normalizeOptionalString(data?.clubId);
}

function isAcademicEventData(data) {
  return (
    normalizeOptionalString(data?.scope) === 'academic'
    || normalizeOptionalString(data?.category) === 'academic'
    || normalizeOptionalString(data?.type) === 'academic'
  );
}

async function getMembershipSnapshot(clubId, userId) {
  return admin.firestore().doc(`clubs/${clubId}/memberships/${userId}`).get();
}

async function callerHasApprovedMembership(caller, clubId) {
  if (caller.role === 'admin') return true;
  const membershipSnap = await getMembershipSnapshot(clubId, caller.uid);
  if (!membershipSnap.exists) return false;
  return approvedMembershipStatus(membershipSnap.data()?.status);
}

async function canReadClubSnapshot(caller, clubSnap) {
  const clubData = clubSnap.data() || {};
  if (callerManagesClubData(caller, clubData)) return true;

  const visibility = normalizeVisibility(clubData.visibility, 'school');
  if (visibility === 'school' && !clubHasGatedContent(clubData)) {
    return true;
  }
  if (visibility === 'managers') {
    return false;
  }

  return callerHasApprovedMembership(caller, clubSnap.id);
}

async function assertClubReadable(caller, clubId) {
  const clubSnap = await getClubSnapshot(clubId);
  if (!(await canReadClubSnapshot(caller, clubSnap))) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have access to this club.');
  }
  return clubSnap;
}

async function canReadPostData(caller, clubSnap, postData) {
  if (!(await canReadClubSnapshot(caller, clubSnap))) {
    return false;
  }
  if (callerManagesClubData(caller, clubSnap.data() || {})) {
    return true;
  }

  const visibility = normalizeVisibility(postData?.visibility, 'members');
  if (visibility === 'school') {
    return true;
  }
  if (visibility === 'managers') {
    return false;
  }

  return callerHasApprovedMembership(caller, clubSnap.id);
}

async function canReadEventData(caller, eventData) {
  if (caller.role === 'admin') return true;

  const clubId = getEventGroupId(eventData);
  if (!clubId || isAcademicEventData(eventData)) {
    return true;
  }

  const clubSnap = await getClubSnapshot(clubId).catch(() => null);
  if (!clubSnap) {
    return false;
  }
  if (!(await canReadClubSnapshot(caller, clubSnap))) {
    return false;
  }
  if (callerManagesClubData(caller, clubSnap.data() || {})) {
    return true;
  }

  const visibility = normalizeVisibility(eventData?.visibility, 'members');
  if (visibility === 'school') {
    return true;
  }
  if (visibility === 'managers') {
    return false;
  }

  return callerHasApprovedMembership(caller, clubId);
}

function toClubRecord(snapshot) {
  const data = snapshot.data() || {};
  const defaultMeetLink = normalizeOptionalString(data.defaultMeetLink) || normalizeOptionalString(data.meetLink);
  return {
    id: snapshot.id,
    name: normalizeOptionalString(data.name) || 'Unnamed club',
    description: normalizeOptionalString(data.description) || '',
    category: normalizeOptionalString(data.category) || 'club',
    groupType: normalizeClubGroupType(data.groupType),
    mic: normalizeOptionalString(data.mic) || 'N/A',
    schedule: normalizeOptionalString(data.schedule) || 'TBD',
    meetingLocation: normalizeOptionalString(data.meetingLocation) || undefined,
    logoUrl: normalizeOptionalString(data.logoUrl) || undefined,
    classroomLink: normalizeOptionalString(data.classroomLink),
    classroomCode: normalizeOptionalString(data.classroomCode),
    classroomCourseId: normalizeOptionalString(data.classroomCourseId),
    defaultMeetLink,
    meetLink: defaultMeetLink,
    resourceLinks: normalizeResourceLinks(data.resourceLinks),
    membershipMode: normalizeMembershipMode(data.membershipMode),
    visibility: normalizeVisibility(data.visibility, 'school'),
    managerIds: normalizeStringArray(data.managerIds),
    memberCount: typeof data.memberCount === 'number' ? data.memberCount : 0,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt)
  };
}

function toPostRecord(snapshot, fallbackGroupId) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    title: normalizeOptionalString(data.title) || 'Update',
    content: normalizeOptionalString(data.content) || normalizeOptionalString(data.text) || '',
    category: normalizeOptionalString(data.category) || 'club',
    relatedGroupId: normalizeOptionalString(data.relatedGroupId) || normalizeOptionalString(data.clubId) || fallbackGroupId || null,
    linkedEventId: normalizeOptionalString(data.linkedEventId),
    classroomLink: normalizeOptionalString(data.classroomLink),
    meetLink: normalizeOptionalString(data.meetLink),
    resourceLinks: normalizeResourceLinks(data.resourceLinks),
    postedByUid: normalizeOptionalString(data.postedByUid) || normalizeOptionalString(data.authorId) || 'unknown',
    postedByNameSnapshot:
      normalizeOptionalString(data.postedByNameSnapshot)
      || normalizeOptionalString(data.authorName)
      || 'Unknown author',
    postedByEmailSnapshot:
      normalizeOptionalString(data.postedByEmailSnapshot)
      || normalizeOptionalString(data.authorEmail)
      || '',
    postedByRoleSnapshot:
      normalizeOptionalString(data.postedByRoleSnapshot)
      || normalizeOptionalString(data.authorRole)
      || 'student',
    visibility: normalizeVisibility(data.visibility, 'members'),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt)
  };
}

function toEventRecord(snapshot) {
  const data = snapshot.data() || {};
  const relatedGroupId = getEventGroupId(data);
  return {
    id: snapshot.id,
    title: normalizeOptionalString(data.title) || 'Untitled event',
    description: normalizeOptionalString(data.description) || undefined,
    category: normalizeOptionalString(data.category) || (relatedGroupId ? 'club' : 'school_wide'),
    scope: normalizeOptionalString(data.scope) || (isAcademicEventData(data) ? 'academic' : relatedGroupId ? 'group' : 'school'),
    relatedGroupId: relatedGroupId || undefined,
    startTime: timestampToIso(data.startTime) || timestampToIso(data.createdAt),
    endTime: timestampToIso(data.endTime) || timestampToIso(data.startTime) || timestampToIso(data.createdAt),
    allDay: !!data.allDay,
    location: normalizeOptionalString(data.location) || undefined,
    classroomLink: normalizeOptionalString(data.classroomLink),
    classroomCourseId: normalizeOptionalString(data.classroomCourseId),
    classroomPostLink: normalizeOptionalString(data.classroomPostLink),
    meetLink: normalizeOptionalString(data.meetLink),
    resourceLinks: normalizeResourceLinks(data.resourceLinks),
    attendanceEnabled: data.attendanceEnabled !== false,
    createdByUid: normalizeOptionalString(data.createdByUid) || normalizeOptionalString(data.authorId) || undefined,
    createdByNameSnapshot:
      normalizeOptionalString(data.createdByNameSnapshot)
      || normalizeOptionalString(data.authorName)
      || normalizeOptionalString(data.postedByNameSnapshot)
      || undefined,
    createdByEmailSnapshot:
      normalizeOptionalString(data.createdByEmailSnapshot)
      || normalizeOptionalString(data.authorEmail)
      || normalizeOptionalString(data.postedByEmailSnapshot)
      || undefined,
    createdByRoleSnapshot:
      normalizeOptionalString(data.createdByRoleSnapshot)
      || normalizeOptionalString(data.authorRole)
      || normalizeOptionalString(data.postedByRoleSnapshot)
      || undefined,
    visibility: normalizeVisibility(data.visibility, relatedGroupId ? 'members' : 'school'),
    sourceMetadata: {
      source: normalizeOptionalString(data?.sourceMetadata?.source) || normalizeOptionalString(data.source) || undefined,
      sourceId: normalizeOptionalString(data?.sourceMetadata?.sourceId) || normalizeOptionalString(data.sourceId) || undefined,
      sourceDataset: normalizeOptionalString(data?.sourceMetadata?.sourceDataset) || normalizeOptionalString(data.sourceDataset) || undefined,
      sourceTerm: normalizeOptionalString(data?.sourceMetadata?.sourceTerm) || normalizeOptionalString(data.sourceTerm) || undefined,
      sourceHash: normalizeOptionalString(data?.sourceMetadata?.sourceHash) || normalizeOptionalString(data.sourceHash) || undefined
    },
    clubId: relatedGroupId || undefined,
    rsvpCount: typeof data.rsvpCount === 'number' ? data.rsvpCount : 0,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt)
  };
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

exports.listVisibleClubs = functions.https.onCall(async (_data, context) => {
  const caller = await getCallerContext(context);
  const snap = await admin.firestore().collection('clubs').orderBy('name').get();
  const visible = await Promise.all(
    snap.docs.map(async (clubDoc) => ((await canReadClubSnapshot(caller, clubDoc)) ? toClubRecord(clubDoc) : null))
  );
  return visible.filter(Boolean);
});

exports.listClubPosts = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  const clubSnap = await assertClubReadable(caller, clubId);
  const snap = await admin.firestore().collection(`clubs/${clubId}/posts`).orderBy('createdAt', 'desc').get();
  const visible = await Promise.all(
    snap.docs.map(async (postDoc) => ((await canReadPostData(caller, clubSnap, postDoc.data())) ? toPostRecord(postDoc, clubId) : null))
  );
  return visible.filter(Boolean);
});

exports.listVisibleEvents = functions.https.onCall(async (_data, context) => {
  const caller = await getCallerContext(context);
  const snap = await admin.firestore().collection('events').orderBy('startTime').get();
  const visible = await Promise.all(
    snap.docs.map(async (eventDoc) => ((await canReadEventData(caller, eventDoc.data())) ? toEventRecord(eventDoc) : null))
  );
  return visible.filter(Boolean);
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

exports.createClubPost = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeRequiredString(data?.clubId, 'clubId');
  await assertClubAccess(caller, clubId);

  const linkedEventId = normalizeOptionalString(data?.linkedEventId);
  if (linkedEventId) {
    const linkedEventSnap = await admin.firestore().doc(`events/${linkedEventId}`).get();
    if (!linkedEventSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Linked event not found.');
    }
    if (getEventGroupId(linkedEventSnap.data()) !== clubId) {
      throw new functions.https.HttpsError('failed-precondition', 'Linked event must belong to the same club.');
    }
  }

  const postRef = await admin.firestore().collection(`clubs/${clubId}/posts`).add({
    clubId,
    relatedGroupId: clubId,
    title: normalizeOptionalString(data?.title) || 'Club update',
    content: normalizeRequiredString(data?.content, 'content'),
    category: normalizeOptionalString(data?.category) || 'club',
    linkedEventId,
    classroomLink: normalizeOptionalString(data?.classroomLink),
    meetLink: normalizeOptionalString(data?.meetLink),
    resourceLinks: normalizeResourceLinks(data?.resourceLinks),
    visibility: normalizeVisibility(data?.visibility, 'members'),
    authorId: caller.uid,
    authorName: caller.name,
    authorEmail: caller.email,
    authorRole: caller.role,
    postedByUid: caller.uid,
    postedByNameSnapshot: caller.name,
    postedByEmailSnapshot: caller.email,
    postedByRoleSnapshot: caller.role,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return toPostRecord(await postRef.get(), clubId);
});

exports.saveClubMetadata = functions.https.onCall(async (data, context) => {
  const caller = await getCallerContext(context);
  const clubId = normalizeOptionalString(data?.id);
  const clubRef = clubId
    ? admin.firestore().doc(`clubs/${clubId}`)
    : admin.firestore().collection('clubs').doc();
  const existingSnap = clubId ? await clubRef.get() : null;
  const existingData = existingSnap?.exists ? existingSnap.data() || {} : {};

  if (!clubId && caller.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create clubs.');
  }

  if (caller.role !== 'admin') {
    if (!clubId) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can create clubs.');
    }
    await assertClubAccess(caller, clubId);

    const allowedManagerFields = new Set(['id', 'description', 'schedule', 'meetingLocation']);
    const submittedFields = Object.keys(data || {});
    const disallowed = submittedFields.filter((key) => !allowedManagerFields.has(key));
    if (disallowed.length > 0) {
      throw new functions.https.HttpsError('permission-denied', 'Managers can only update the club description, schedule, and meeting location.');
    }

    await clubRef.set(
      {
        description: normalizeOptionalString(data?.description) || '',
        schedule: normalizeRequiredString(data?.schedule ?? existingData.schedule, 'schedule'),
        meetingLocation: normalizeOptionalString(data?.meetingLocation),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return toClubRecord(await clubRef.get());
  }

  const managerIds = Array.from(new Set(normalizeStringArray(data?.managerIds)));
  const payload = {
    name: normalizeRequiredString(data?.name ?? existingData.name, 'name'),
    description: normalizeOptionalString(data?.description) || '',
    category: normalizeRequiredString(data?.category ?? existingData.category, 'category'),
    groupType: normalizeClubGroupType(data?.groupType ?? existingData.groupType),
    mic: normalizeRequiredString(data?.mic ?? existingData.mic, 'mic'),
    schedule: normalizeRequiredString(data?.schedule ?? existingData.schedule, 'schedule'),
    meetingLocation: normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(data || {}, 'meetingLocation') ? data?.meetingLocation : existingData.meetingLocation
    ),
    logoUrl: normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(data || {}, 'logoUrl') ? data?.logoUrl : existingData.logoUrl
    ),
    classroomLink: normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(data || {}, 'classroomLink') ? data?.classroomLink : existingData.classroomLink
    ),
    classroomCode: normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(data || {}, 'classroomCode') ? data?.classroomCode : existingData.classroomCode
    ),
    classroomCourseId: normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(data || {}, 'classroomCourseId') ? data?.classroomCourseId : existingData.classroomCourseId
    ),
    defaultMeetLink: normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(data || {}, 'defaultMeetLink') ? data?.defaultMeetLink : existingData.defaultMeetLink
    ),
    meetLink: normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(data || {}, 'meetLink') ? data?.meetLink : existingData.meetLink
    ),
    resourceLinks: Object.prototype.hasOwnProperty.call(data || {}, 'resourceLinks')
      ? normalizeResourceLinks(data?.resourceLinks)
      : normalizeResourceLinks(existingData.resourceLinks),
    membershipMode: normalizeMembershipMode(data?.membershipMode ?? existingData.membershipMode),
    visibility: normalizeVisibility(data?.visibility ?? existingData.visibility, 'school'),
    managerIds: managerIds.length > 0 ? managerIds : normalizeStringArray(existingData.managerIds),
    memberCount: normalizeNonNegativeNumber(
      Object.prototype.hasOwnProperty.call(data || {}, 'memberCount') ? data?.memberCount : existingData.memberCount,
      0
    ),
    updatedAt: FieldValue.serverTimestamp()
  };

  const persistedPayload = existingSnap?.exists
    ? payload
    : {
        ...payload,
        managerIds: payload.managerIds.length > 0 ? payload.managerIds : [caller.uid],
        createdAt: FieldValue.serverTimestamp()
      };

  await clubRef.set(persistedPayload, { merge: true });
  return toClubRecord(await clubRef.get());
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
  if (!(await canReadEventData(caller, eventSnap.data() || {}))) {
    throw new functions.https.HttpsError('permission-denied', 'You are not eligible to RSVP for this event.');
  }
  if (eventSnap.data()?.attendanceEnabled === false && attending) {
    throw new functions.https.HttpsError('failed-precondition', 'Attendance tracking is disabled for this event.');
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
    visibility: normalizeVisibility(data?.visibility, 'members'),
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

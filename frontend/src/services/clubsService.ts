import {
  addDoc,
  collection,
  collectionGroup,
  documentId,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import type { MembershipRecord } from '../types/Membership';
import type { PostRecord } from '../types/Post';
import type { Club } from '../types/Club';
import type { AppUser } from '../types/User';
import { callFunction } from '../firebase/functions';
import { firestore } from '../firebase/firestore';
import {
  mapClubData,
  mapMembershipData,
  mapPostData
} from './recordMappers';

const clubsRef = collection(firestore, 'clubs');

const postsCollection = (clubId: string) => collection(firestore, `clubs/${clubId}/posts`);

function mapClub(snapshot: any): Club {
  return mapClubData(snapshot.id, snapshot.data());
}

function mapPost(snapshot: any, fallbackGroupId?: string): PostRecord {
  return mapPostData(snapshot.id, snapshot.data(), fallbackGroupId);
}

export async function listClubs(): Promise<Club[]> {
  const q = query(clubsRef, orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapClub(docSnap));
}

export async function getClub(id: string): Promise<Club | null> {
  const snap = await getDoc(doc(clubsRef, id));
  if (!snap.exists()) return null;
  return mapClub(snap);
}

function mapMembership(snapshot: any): MembershipRecord {
  return mapMembershipData(snapshot.id, snapshot.data(), snapshot.ref.parent.parent?.id);
}

export type CreateClubInput = Omit<Club, 'id' | 'memberCount' | 'resourceLinks'> & {
  memberCount?: number;
  resourceLinks?: Club['resourceLinks'];
};

export async function saveClub(input: CreateClubInput & { id?: string }, author?: AppUser) {
  const payload = {
    name: input.name,
    description: input.description,
    category: input.category,
    groupType: input.groupType ?? 'club',
    mic: input.mic,
    schedule: input.schedule,
    meetingLocation: input.meetingLocation ?? null,
    logoUrl: input.logoUrl ?? null,
    classroomLink: input.classroomLink ?? null,
    classroomCode: input.classroomCode ?? null,
    classroomCourseId: input.classroomCourseId ?? null,
    defaultMeetLink: input.defaultMeetLink ?? input.meetLink ?? null,
    meetLink: input.defaultMeetLink ?? input.meetLink ?? null,
    resourceLinks: input.resourceLinks ?? [],
    membershipMode: input.membershipMode ?? 'open',
    visibility: input.visibility ?? 'school',
    managerIds: input.managerIds ?? (author ? [author.id] : []),
    memberCount: input.memberCount ?? 0,
    updatedAt: serverTimestamp()
  };
  const clubRef = input.id ? doc(clubsRef, input.id) : doc(clubsRef);
  await setDoc(clubRef, input.id ? payload : { ...payload, createdAt: serverTimestamp() }, { merge: true });
  const snap = await getDoc(clubRef);
  return mapClub(snap);
}

export async function createClub(input: CreateClubInput, author?: AppUser) {
  return saveClub(input, author);
}

export async function joinClub(clubId: string, user: AppUser) {
  return callFunction<{ clubId: string; joined: boolean }, { ok: true; joined: boolean; status: 'approved' | 'pending' | 'removed' }>('setClubMembership', {
    clubId,
    joined: true
  });
}

export async function leaveClub(clubId: string, user: AppUser) {
  return callFunction<{ clubId: string; joined: boolean }, { ok: true; joined: boolean; status: 'approved' | 'pending' | 'removed' }>('setClubMembership', {
    clubId,
    joined: false
  });
}

export async function listClubPosts(clubId: string): Promise<PostRecord[]> {
  const q = query(postsCollection(clubId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapPost(docSnap, clubId));
}

export type ClubPostInput = {
  title?: string;
  content: string;
  category?: PostRecord['category'];
  linkedEventId?: string | null;
  classroomLink?: string | null;
  meetLink?: string | null;
  resourceLinks?: PostRecord['resourceLinks'];
  visibility?: PostRecord['visibility'];
};

export async function addClubPost(clubId: string, input: ClubPostInput, author: AppUser) {
  await addDoc(postsCollection(clubId), {
    clubId,
    relatedGroupId: clubId,
    title: input.title ?? 'Club update',
    content: input.content,
    category: input.category ?? 'club',
    classroomLink: input.classroomLink ?? null,
    meetLink: input.meetLink ?? null,
    resourceLinks: input.resourceLinks ?? [],
    linkedEventId: input.linkedEventId ?? null,
    authorId: author.id,
    authorName: author.name,
    authorEmail: author.email,
    authorRole: author.role,
    postedByUid: author.id,
    postedByNameSnapshot: author.name,
    postedByEmailSnapshot: author.email,
    postedByRoleSnapshot: author.role,
    visibility: input.visibility ?? 'members',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
  const memberships = collectionGroup(firestore, 'memberships');
  const [byUserId, byLegacyDocId] = await Promise.all([
    getDocs(query(memberships, where('userId', '==', userId))),
    getDocs(query(memberships, where(documentId(), '==', userId)))
  ]);
  const deduped = new Map<string, MembershipRecord>();
  [...byUserId.docs, ...byLegacyDocId.docs].forEach((docSnap) => {
    const record = mapMembership(docSnap);
    if (!record.groupId) return;
    deduped.set(record.groupId, record);
  });
  return Array.from(deduped.values());
}

export type MembershipRequestRecord = MembershipRecord & {
  user: AppUser | null;
};

export async function listClubMembershipRequests(clubId: string) {
  return callFunction<{ clubId: string }, MembershipRequestRecord[]>('listClubMembershipRequests', { clubId });
}

export async function setClubMembershipStatus(clubId: string, userId: string, status: 'approved' | 'rejected') {
  return callFunction<{ clubId: string; userId: string; status: 'approved' | 'rejected' }, { ok: true; status: 'approved' | 'rejected' }>(
    'setClubMembershipStatus',
    { clubId, userId, status }
  );
}

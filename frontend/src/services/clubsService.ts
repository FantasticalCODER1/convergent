import {
  Timestamp,
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { normalizeCategory } from '../domain/categories';
import type { MembershipRecord } from '../types/Membership';
import type { PostRecord } from '../types/Post';
import type { Club } from '../types/Club';
import type { AppUser } from '../types/User';
import { callFunction } from '../firebase/functions';
import { firestore } from '../firebase/firestore';

const clubsRef = collection(firestore, 'clubs');

const postsCollection = (clubId: string) => collection(firestore, `clubs/${clubId}/posts`);

function toIso(value?: Timestamp | null) {
  if (!value) return undefined;
  return value.toDate().toISOString();
}

function normalizeString(value?: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function mapResourceLinks(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const label = normalizeString((entry as { label?: unknown }).label);
      const url = normalizeString((entry as { url?: unknown }).url);
      const kind = normalizeString((entry as { kind?: unknown }).kind);
      if (!label || !url) return null;
      return { label, url, kind: kind as 'resource' | 'classroom' | 'meet' | 'reference' | undefined };
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);
}

function mapClub(snapshot: any): Club {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name ?? 'Unnamed club',
    description: data.description ?? '',
    category: normalizeCategory(data.category),
    groupType: (normalizeString(data.groupType) as Club['groupType']) ?? 'club',
    mic: data.mic ?? 'N/A',
    schedule: data.schedule ?? 'TBD',
    meetingLocation: normalizeString(data.meetingLocation),
    logoUrl: data.logoUrl,
    classroomLink: normalizeString(data.classroomLink) ?? null,
    meetLink: normalizeString(data.meetLink) ?? null,
    resourceLinks: mapResourceLinks(data.resourceLinks),
    membershipMode: (normalizeString(data.membershipMode) as Club['membershipMode']) ?? 'open',
    visibility: (normalizeString(data.visibility) as Club['visibility']) ?? 'school',
    managerIds: data.managerIds ?? [],
    memberCount: data.memberCount ?? 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapPost(snapshot: any, fallbackGroupId?: string): PostRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: normalizeString(data.title) ?? 'Update',
    content: normalizeString(data.content) ?? normalizeString(data.text) ?? '',
    category: normalizeCategory(data.category, 'club'),
    relatedGroupId: normalizeString(data.relatedGroupId) ?? normalizeString(data.clubId) ?? fallbackGroupId ?? null,
    linkedEventId: normalizeString(data.linkedEventId) ?? null,
    classroomLink: normalizeString(data.classroomLink) ?? null,
    meetLink: normalizeString(data.meetLink) ?? null,
    resourceLinks: mapResourceLinks(data.resourceLinks),
    postedByUid: normalizeString(data.postedByUid) ?? normalizeString(data.authorId) ?? 'unknown',
    postedByNameSnapshot: normalizeString(data.postedByNameSnapshot) ?? normalizeString(data.authorName) ?? 'Unknown author',
    postedByEmailSnapshot: normalizeString(data.postedByEmailSnapshot) ?? '',
    postedByRoleSnapshot: normalizeString(data.postedByRoleSnapshot) ?? 'student',
    visibility: (normalizeString(data.visibility) as PostRecord['visibility']) ?? 'members',
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
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
  const data = snapshot.data();
  const groupId = normalizeString(data.groupId) ?? snapshot.ref.parent.parent?.id ?? '';
  return {
    id: snapshot.id,
    userId: normalizeString(data.userId) ?? snapshot.id,
    groupId,
    clubId: groupId,
    status: (normalizeString(data.status) as MembershipRecord['status']) ?? 'approved',
    memberRole: (normalizeString(data.memberRole) as MembershipRecord['memberRole']) ?? 'member',
    approvedBy: normalizeString(data.approvedBy),
    approvedAt: toIso(data.approvedAt),
    createdAt: toIso(data.createdAt) ?? toIso(data.joinedAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export type CreateClubInput = Omit<Club, 'id' | 'memberCount' | 'resourceLinks'> & {
  memberCount?: number;
  resourceLinks?: Club['resourceLinks'];
};

export async function createClub(input: CreateClubInput, author?: AppUser) {
  const payload = {
    name: input.name,
    description: input.description,
    category: normalizeCategory(input.category),
    groupType: input.groupType ?? 'club',
    mic: input.mic,
    schedule: input.schedule,
    meetingLocation: input.meetingLocation ?? null,
    logoUrl: input.logoUrl ?? null,
    classroomLink: input.classroomLink ?? null,
    meetLink: input.meetLink ?? null,
    resourceLinks: input.resourceLinks ?? [],
    membershipMode: input.membershipMode ?? 'open',
    visibility: input.visibility ?? 'school',
    managerIds: input.managerIds ?? (author ? [author.id] : []),
    memberCount: input.memberCount ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(clubsRef, payload);
  const snap = await getDoc(docRef);
  return mapClub(snap);
}

export async function joinClub(clubId: string, user: AppUser) {
  await callFunction<{ clubId: string; joined: boolean }, { ok: true; joined: boolean }>('setClubMembership', {
    clubId,
    joined: true
  });
}

export async function leaveClub(clubId: string, user: AppUser) {
  await callFunction<{ clubId: string; joined: boolean }, { ok: true; joined: boolean }>('setClubMembership', {
    clubId,
    joined: false
  });
}

export async function listClubPosts(clubId: string): Promise<PostRecord[]> {
  const q = query(postsCollection(clubId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapPost(docSnap, clubId));
}

export async function addClubPost(clubId: string, content: string, author: AppUser, title = 'Club update') {
  await addDoc(postsCollection(clubId), {
    clubId,
    relatedGroupId: clubId,
    title,
    content,
    category: 'club',
    classroomLink: null,
    meetLink: null,
    resourceLinks: [],
    linkedEventId: null,
    postedByUid: author.id,
    postedByNameSnapshot: author.name,
    postedByEmailSnapshot: author.email,
    postedByRoleSnapshot: author.role,
    visibility: 'members',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
  const q = query(collectionGroup(firestore, 'memberships'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapMembership(docSnap));
}

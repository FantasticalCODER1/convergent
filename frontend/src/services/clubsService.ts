import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
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
  mapMembershipData
} from './recordMappers';

const clubsRef = collection(firestore, 'clubs');

function mapClub(snapshot: any): Club {
  return mapClubData(snapshot.id, snapshot.data());
}

export async function listClubs(): Promise<Club[]> {
  return callFunction<undefined, Club[]>('listVisibleClubs', undefined);
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

export async function saveClub(input: Record<string, unknown> & { id?: string }, author?: AppUser) {
  return callFunction<Record<string, unknown> & { id?: string }, Club>('saveClubMetadata', {
    id: input.id,
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
    memberCount: input.memberCount ?? 0
  });
}

export async function createClub(input: CreateClubInput, author?: AppUser) {
  return saveClub(input, author);
}

export async function joinClub(clubId: string, _user: AppUser) {
  return callFunction<{ clubId: string; joined: boolean }, { ok: true; joined: boolean; status: 'approved' | 'pending' | 'removed' }>('setClubMembership', {
    clubId,
    joined: true
  });
}

export async function leaveClub(clubId: string, _user: AppUser) {
  return callFunction<{ clubId: string; joined: boolean }, { ok: true; joined: boolean; status: 'approved' | 'pending' | 'removed' }>('setClubMembership', {
    clubId,
    joined: false
  });
}

export async function listClubPosts(clubId: string): Promise<PostRecord[]> {
  return callFunction<{ clubId: string }, PostRecord[]>('listClubPosts', { clubId });
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

export async function addClubPost(clubId: string, input: ClubPostInput, _author: AppUser) {
  return callFunction<
    {
      clubId: string;
      title?: string;
      content: string;
      category?: PostRecord['category'];
      linkedEventId?: string | null;
      classroomLink?: string | null;
      meetLink?: string | null;
      resourceLinks?: PostRecord['resourceLinks'];
      visibility?: PostRecord['visibility'];
    },
    PostRecord
  >('createClubPost', {
    clubId,
    title: input.title ?? 'Club update',
    content: input.content,
    category: input.category ?? 'club',
    classroomLink: input.classroomLink ?? null,
    meetLink: input.meetLink ?? null,
    resourceLinks: input.resourceLinks ?? [],
    linkedEventId: input.linkedEventId ?? null,
    visibility: input.visibility ?? 'members'
  });
}

export async function listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
  const memberships = collectionGroup(firestore, 'memberships');
  const [byUserId, legacyMemberships] = await Promise.all([
    getDocs(query(memberships, where('userId', '==', userId))),
    getDocs(memberships)
  ]);
  const deduped = new Map<string, MembershipRecord>();
  const byLegacyDocId = legacyMemberships.docs.filter((docSnap) => docSnap.id === userId);
  [...byUserId.docs, ...byLegacyDocId].forEach((docSnap) => {
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

import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import type { Club, ClubPost } from '../types/Club';
import type { AppUser } from '../types/User';
import { firestore } from '../firebase/firestore';

const clubsRef = collection(firestore, 'clubs');

const postsCollection = (clubId: string) => collection(firestore, `clubs/${clubId}/posts`);

function toIso(value?: Timestamp | null) {
  if (!value) return undefined;
  return value.toDate().toISOString();
}

function mapClub(snapshot: any): Club {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name ?? 'Unnamed club',
    description: data.description ?? '',
    category: data.category ?? 'General',
    mic: data.mic ?? 'N/A',
    schedule: data.schedule ?? 'TBD',
    logoUrl: data.logoUrl,
    managerIds: data.managerIds ?? [],
    memberCount: data.memberCount ?? 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapPost(snapshot: any): ClubPost {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    clubId: data.clubId,
    authorId: data.authorId,
    authorName: data.authorName,
    text: data.text,
    createdAt: toIso(data.createdAt)
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

export type CreateClubInput = Omit<Club, 'id' | 'memberCount'> & { memberCount?: number };

export async function createClub(input: CreateClubInput, author?: AppUser) {
  const payload = {
    name: input.name,
    description: input.description,
    category: input.category,
    mic: input.mic,
    schedule: input.schedule,
    logoUrl: input.logoUrl ?? null,
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
  const membershipRef = doc(firestore, `clubs/${clubId}/memberships/${user.id}`);
  const clubDoc = doc(clubsRef, clubId);
  const userDoc = doc(collection(firestore, 'users'), user.id);

  const existing = await getDoc(membershipRef);
  if (existing.exists()) {
    return;
  }

  await setDoc(
    membershipRef,
    {
      userId: user.id,
      joinedAt: serverTimestamp()
    },
    { merge: true }
  );
  await updateDoc(clubDoc, { memberCount: increment(1) });
  await updateDoc(userDoc, { clubsJoined: arrayUnion(clubId) });
}

export async function leaveClub(clubId: string, user: AppUser) {
  const membershipRef = doc(firestore, `clubs/${clubId}/memberships/${user.id}`);
  const clubDoc = doc(clubsRef, clubId);
  const userDoc = doc(collection(firestore, 'users'), user.id);

  const existing = await getDoc(membershipRef);
  if (!existing.exists()) return;

  await deleteDoc(membershipRef);
  await updateDoc(userDoc, { clubsJoined: arrayRemove(clubId) });
  await updateDoc(clubDoc, { memberCount: increment(-1) });
}

export async function listClubPosts(clubId: string): Promise<ClubPost[]> {
  const q = query(postsCollection(clubId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapPost(docSnap));
}

export async function addClubPost(clubId: string, text: string, author: AppUser) {
  await addDoc(postsCollection(clubId), {
    clubId,
    text,
    authorId: author.id,
    authorName: author.name,
    createdAt: serverTimestamp()
  });
}

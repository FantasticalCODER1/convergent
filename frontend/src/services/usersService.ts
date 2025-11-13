import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import type { AppUser, UserRole } from '../types/User';
import { firestore } from '../firebase/firestore';

const usersRef = collection(firestore, 'users');

function mapUser(snapshot: any): AppUser {
  const data = snapshot.data?.() ?? snapshot.data();
  return {
    id: snapshot.id ?? data.id,
    name: data.name ?? 'Student',
    email: data.email ?? '',
    role: (data.role ?? 'student') as UserRole,
    clubsJoined: data.clubsJoined ?? [],
    photoURL: data.photoURL,
    lastLoginAt: toIso(data.lastLoginAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function toIso(value?: Timestamp | null | string) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}

export async function upsertUserProfile(input: AppUser) {
  const ref = doc(usersRef, input.id);
  const existing = await getDoc(ref);
  const createdAtExisting = existing.exists() ? existing.data()?.createdAt : undefined;
  await setDoc(
    ref,
    {
      name: input.name,
      email: input.email,
      role: input.role,
      clubsJoined: input.clubsJoined ?? [],
      photoURL: input.photoURL ?? null,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: input.createdAt
        ? Timestamp.fromDate(new Date(input.createdAt))
        : createdAtExisting ?? serverTimestamp()
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return mapUser(snap);
}

export async function fetchUser(id: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(usersRef, id));
  if (!snap.exists()) return null;
  return mapUser(snap);
}

export async function listUsers(): Promise<AppUser[]> {
  const snaps = await getDocs(usersRef);
  return snaps.docs.map((snap) => mapUser(snap));
}

export async function updateUserRole(id: string, role: UserRole) {
  await updateDoc(doc(usersRef, id), { role, updatedAt: serverTimestamp() });
}

export async function createUser(input: Omit<AppUser, 'id' | 'clubsJoined'> & { clubsJoined?: string[] }) {
  const docRef = await addDoc(usersRef, {
    ...input,
    clubsJoined: input.clubsJoined ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  const snap = await getDoc(docRef);
  return mapUser(snap);
}

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { callFunction } from '../firebase/functions';
import { normalizeUserRole } from '../lib/policy';
import type { AppUser, UserRole } from '../types/User';
import { firestore } from '../firebase/firestore';

const usersRef = collection(firestore, 'users');

function mapUser(snapshot: any): AppUser {
  const data = snapshot.data?.() ?? snapshot.data();
  return {
    id: snapshot.id ?? data.id,
    name: data.name ?? 'Student',
    email: data.email ?? '',
    role: normalizeUserRole(data.role),
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
  const existingRole = normalizeUserRole(existing.exists() ? existing.data()?.role : input.role);
  await setDoc(
    ref,
    {
      name: input.name,
      email: input.email,
      role: existingRole,
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

export async function listClubUsers(clubId: string): Promise<AppUser[]> {
  const records = await callFunction<{ clubId: string }, AppUser[]>('listClubUsers', { clubId });
  return records.map((record) => ({
    ...record,
    role: normalizeUserRole(record.role)
  }));
}

export async function updateUserRole(id: string, role: UserRole) {
  await callFunction<{ id: string; role: UserRole }, { ok: true }>('updateUserRole', {
    id,
    role: normalizeUserRole(role)
  });
}

export async function createUser(input: AppUser) {
  const userRef = doc(usersRef, input.id);
  await setDoc(userRef, {
    name: input.name,
    email: input.email,
    role: normalizeUserRole(input.role),
    clubsJoined: input.clubsJoined ?? [],
    photoURL: input.photoURL ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  const snap = await getDoc(userRef);
  return mapUser(snap);
}

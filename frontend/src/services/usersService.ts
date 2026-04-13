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
import { buildScheduleAudienceKey } from '../domain/profile';
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
    grade: normalizeString(data.grade),
    section: normalizeString(data.section),
    house: normalizeString(data.house),
    residency: normalizeResidency(data.residency),
    scheduleAudienceKey: normalizeString(data.scheduleAudienceKey),
    authProvider: normalizeString(data.authProvider),
    profileCompletedAt: toIso(data.profileCompletedAt),
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

function normalizeString(value?: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeResidency(value?: unknown) {
  return value === 'boarding' || value === 'day' ? value : undefined;
}

export async function upsertUserProfile(input: AppUser) {
  const ref = doc(usersRef, input.id);
  const existing = await getDoc(ref);
  const createdAtExisting = existing.exists() ? existing.data()?.createdAt : undefined;
  const existingRole = normalizeUserRole(existing.exists() ? existing.data()?.role : input.role);
  const grade = normalizeString(input.grade);
  const section = normalizeString(input.section);
  const profileComplete = !!grade && !!section;
  await setDoc(
    ref,
    {
      name: input.name,
      email: input.email,
      role: existingRole,
      clubsJoined: input.clubsJoined ?? [],
      photoURL: input.photoURL ?? null,
      grade: grade ?? null,
      section: section ?? null,
      house: normalizeString(input.house) ?? null,
      residency: normalizeResidency(input.residency) ?? null,
      scheduleAudienceKey: buildScheduleAudienceKey({ grade, section }) || null,
      authProvider: normalizeString(input.authProvider) ?? null,
      profileCompletedAt: profileComplete
        ? input.profileCompletedAt
          ? Timestamp.fromDate(new Date(input.profileCompletedAt))
          : existing.data()?.profileCompletedAt ?? serverTimestamp()
        : null,
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

export type UserProfileUpdate = Pick<AppUser, 'grade' | 'section' | 'house' | 'residency'>;

export async function updateOwnProfile(id: string, input: UserProfileUpdate) {
  const ref = doc(usersRef, id);
  const grade = normalizeString(input.grade);
  const section = normalizeString(input.section);
  await setDoc(
    ref,
    {
      grade: grade ?? null,
      section: section ?? null,
      house: normalizeString(input.house) ?? null,
      residency: normalizeResidency(input.residency) ?? null,
      scheduleAudienceKey: buildScheduleAudienceKey({ grade, section }) || null,
      profileCompletedAt: grade && section ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
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
  const grade = normalizeString(input.grade);
  const section = normalizeString(input.section);
  await setDoc(userRef, {
    name: input.name,
    email: input.email,
    role: normalizeUserRole(input.role),
    clubsJoined: input.clubsJoined ?? [],
    photoURL: input.photoURL ?? null,
    grade: grade ?? null,
    section: section ?? null,
    house: normalizeString(input.house) ?? null,
    residency: normalizeResidency(input.residency) ?? null,
    scheduleAudienceKey: buildScheduleAudienceKey({ grade, section }) || null,
    authProvider: normalizeString(input.authProvider) ?? null,
    profileCompletedAt: grade && section ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  const snap = await getDoc(userRef);
  return mapUser(snap);
}

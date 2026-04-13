import {
  DocumentData,
  DocumentSnapshot,
  Timestamp,
  collection,
  connectFirestoreEmulator,
  getFirestore
} from 'firebase/firestore';
import { getFirebaseApp } from './app';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';

export const firestore = getFirestore(getFirebaseApp());

const shouldUseEmulator = isFirebaseEmulatorMode;
const FIRESTORE_EMULATOR_KEY = '__convergent_firestore_emulator__';
const emulatorFlags = globalThis as typeof globalThis & Record<string, boolean | undefined>;

if (shouldUseEmulator && !emulatorFlags[FIRESTORE_EMULATOR_KEY]) {
  const host = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? '8080');
  connectFirestoreEmulator(firestore, host, port);
  emulatorFlags[FIRESTORE_EMULATOR_KEY] = true;
}

export type WithId<T> = T & { id: string };

export function withId<T>(snap: DocumentSnapshot<DocumentData>): WithId<T> {
  return { id: snap.id, ...(snap.data() as T) };
}

export function timestampToIso(value?: Timestamp | null): string | undefined {
  if (!value) return undefined;
  return value.toDate().toISOString();
}

export function isoToDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  return new Date(value);
}

export function collectionPath(path: string) {
  return collection(firestore, path);
}

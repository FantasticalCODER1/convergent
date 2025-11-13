import {
  DocumentData,
  DocumentSnapshot,
  Timestamp,
  collection,
  connectFirestoreEmulator,
  getFirestore
} from 'firebase/firestore';
import { getFirebaseApp } from './app';

export const firestore = getFirestore(getFirebaseApp());

const shouldUseEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (shouldUseEmulator) {
  const host = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? '8080');
  connectFirestoreEmulator(firestore, host, port);
  // eslint-disable-next-line no-console
  console.info(`[firebase] Connected Firestore emulator at ${host}:${port}`);
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

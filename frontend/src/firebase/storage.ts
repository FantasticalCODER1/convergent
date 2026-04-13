import { connectStorageEmulator, getStorage, ref, uploadBytes, UploadMetadata, getDownloadURL } from 'firebase/storage';
import { getFirebaseApp } from './app';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';

export const storage = getStorage(getFirebaseApp());

const shouldUseStorageEmulator = isFirebaseEmulatorMode;
const STORAGE_EMULATOR_KEY = '__convergent_storage_emulator__';
const emulatorFlags = globalThis as typeof globalThis & Record<string, boolean | undefined>;

if (shouldUseStorageEmulator && !emulatorFlags[STORAGE_EMULATOR_KEY]) {
  const host = import.meta.env.VITE_STORAGE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(import.meta.env.VITE_STORAGE_EMULATOR_PORT ?? '9199');
  connectStorageEmulator(storage, host, port);
  emulatorFlags[STORAGE_EMULATOR_KEY] = true;
}

export async function uploadFile(path: string, file: File | Blob, metadata?: UploadMetadata) {
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, metadata);
  return getDownloadURL(objectRef);
}

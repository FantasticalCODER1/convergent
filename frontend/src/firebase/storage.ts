import { connectStorageEmulator, getStorage, ref, uploadBytes, UploadMetadata, getDownloadURL } from 'firebase/storage';
import { getFirebaseApp } from './app';

export const storage = getStorage(getFirebaseApp());

const shouldUseStorageEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (shouldUseStorageEmulator) {
  const host = import.meta.env.VITE_STORAGE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(import.meta.env.VITE_STORAGE_EMULATOR_PORT ?? '9199');
  connectStorageEmulator(storage, host, port);
  // eslint-disable-next-line no-console
  console.info(`[firebase] Connected Storage emulator at ${host}:${port}`);
}

export async function uploadFile(path: string, file: File | Blob, metadata?: UploadMetadata) {
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, metadata);
  return getDownloadURL(objectRef);
}

import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from './app';

export const functions = getFunctions(getFirebaseApp());

const shouldUseFunctionsEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (shouldUseFunctionsEmulator) {
  const host = import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT ?? '5001');
  connectFunctionsEmulator(functions, host, port);
  // eslint-disable-next-line no-console
  console.info(`[firebase] Connected Functions emulator at ${host}:${port}`);
}

export async function callFunction<TInput, TOutput>(name: string, payload?: TInput) {
  const callable = httpsCallable<TInput | undefined, TOutput>(functions, name);
  const response = await callable(payload);
  return response.data;
}

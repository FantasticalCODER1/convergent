import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from './app';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';

export const functions = getFunctions(getFirebaseApp());

const shouldUseFunctionsEmulator = isFirebaseEmulatorMode;
const FUNCTIONS_EMULATOR_KEY = '__convergent_functions_emulator__';
const emulatorFlags = globalThis as typeof globalThis & Record<string, boolean | undefined>;

if (shouldUseFunctionsEmulator && !emulatorFlags[FUNCTIONS_EMULATOR_KEY]) {
  const host = import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT ?? '5001');
  connectFunctionsEmulator(functions, host, port);
  emulatorFlags[FUNCTIONS_EMULATOR_KEY] = true;
}

export async function callFunction<TInput, TOutput>(name: string, payload?: TInput) {
  const callable = httpsCallable<TInput | undefined, TOutput>(functions, name);
  const response = await callable(payload);
  return response.data;
}

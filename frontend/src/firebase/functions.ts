import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from './app';
import { firebaseRuntimeMode, isFirebaseEmulatorMode } from '../lib/firebaseEnv';

const shouldUseFunctions = firebaseRuntimeMode === 'firebase' || isFirebaseEmulatorMode;
export const functions = shouldUseFunctions ? getFunctions(getFirebaseApp()) : null;

const shouldUseFunctionsEmulator = isFirebaseEmulatorMode;
const FUNCTIONS_EMULATOR_KEY = '__convergent_functions_emulator__';
const emulatorFlags = globalThis as typeof globalThis & Record<string, boolean | undefined>;

if (functions && shouldUseFunctionsEmulator && !emulatorFlags[FUNCTIONS_EMULATOR_KEY]) {
  const host = import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT ?? '5001');
  connectFunctionsEmulator(functions, host, port);
  emulatorFlags[FUNCTIONS_EMULATOR_KEY] = true;
}

function localFunctionFallback<TOutput>(name: string): TOutput {
  switch (name) {
    case 'listVisibleClubs':
    case 'listVisibleEvents':
    case 'listClubPosts':
    case 'listClubMembershipRequests':
    case 'listClubUsers':
    case 'listClubCertificates':
    case 'listEventAttendance':
      return [] as TOutput;
    case 'verifyCertificate':
      return null as TOutput;
    default:
      throw new Error('Firebase Functions are not available in local data mode.');
  }
}

export async function callFunction<TInput, TOutput>(name: string, payload?: TInput) {
  if (!functions) {
    return localFunctionFallback<TOutput>(name);
  }
  const callable = httpsCallable<TInput | undefined, TOutput>(functions, name);
  const response = await callable(payload);
  return response.data;
}

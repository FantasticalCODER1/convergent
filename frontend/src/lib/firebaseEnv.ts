const EMULATOR_PROJECT_ID = (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-convergent').trim() || 'demo-convergent';

export const isDevMode = import.meta.env.DEV;
export const isFirebaseEmulatorMode = isDevMode && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
export const emulatorProjectId = EMULATOR_PROJECT_ID;

const REQUIRED_FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_APP_ID'
] as const;

function normalizeFlag(value?: string) {
  return String(value ?? '').trim().toLowerCase();
}

const explicitEmulatorFlag = normalizeFlag(import.meta.env.VITE_USE_FIREBASE_EMULATORS);
const hasExplicitEmulatorEnable = explicitEmulatorFlag === 'true' || explicitEmulatorFlag === '1';
const hasExplicitEmulatorDisable = explicitEmulatorFlag === 'false' || explicitEmulatorFlag === '0';

export const isDevMode = import.meta.env.DEV;
export const hasFirebaseConfiguration = REQUIRED_FIREBASE_KEYS.every((key) => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim().length > 0;
});

export const isFirebaseEmulatorMode =
  isDevMode && (hasExplicitEmulatorEnable || (!hasExplicitEmulatorDisable && !hasFirebaseConfiguration));

export const firebaseRuntimeMode = isFirebaseEmulatorMode
  ? 'emulator'
  : hasFirebaseConfiguration
    ? 'firebase'
    : 'unconfigured';

export const emulatorProjectId =
  (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-convergent').trim() || 'demo-convergent';

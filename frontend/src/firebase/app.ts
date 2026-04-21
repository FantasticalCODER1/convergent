import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { emulatorProjectId, firebaseRuntimeMode, hasFirebaseConfiguration, isFirebaseEmulatorMode } from '../lib/firebaseEnv';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  messagingSenderId?: string;
};

function getConfig(): FirebaseConfig {
  const configuredProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim();
  const projectId = configuredProjectId || emulatorProjectId;
  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? (isFirebaseEmulatorMode ? 'demo-api-key' : ''),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? (isFirebaseEmulatorMode ? `${projectId}.firebaseapp.com` : ''),
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? (isFirebaseEmulatorMode ? `${projectId}.appspot.com` : ''),
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? (isFirebaseEmulatorMode ? '1:000000000000:web:demo-convergent' : ''),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined
  };

  const missing = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'].filter((key) => {
    const value = config[key as keyof FirebaseConfig];
    return !value;
  });

  if (missing.length > 0 && firebaseRuntimeMode === 'firebase') {
    throw new Error(`Missing Firebase config values: ${missing.join(', ')}`);
  }

  return config;
}

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(getConfig());
  }
  return app;
}

export function getFirebaseRuntimeSummary() {
  return {
    runtimeMode: firebaseRuntimeMode,
    hasFirebaseConfiguration,
    usesEmulators: isFirebaseEmulatorMode
  };
}

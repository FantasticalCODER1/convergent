import { FirebaseApp, initializeApp, getApps } from 'firebase/app';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  messagingSenderId?: string;
};

const isEmulatorMode = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

function getConfig(): FirebaseConfig {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-convergent';
  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? (isEmulatorMode ? 'demo-api-key' : ''),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? (isEmulatorMode ? `${projectId}.firebaseapp.com` : ''),
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? (isEmulatorMode ? `${projectId}.appspot.com` : ''),
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? (isEmulatorMode ? '1:000000000000:web:demo-convergent' : ''),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
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

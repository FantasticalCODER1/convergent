import { LocalProvider } from './local/LocalProvider';
// Future: import { FirebaseProvider } from './firebase/FirebaseProvider';

const mode = (import.meta.env.VITE_DATA_MODE ?? 'local').toLowerCase();

// eslint-disable-next-line @typescript-eslint/init-declarations
let provider: LocalProvider;
// When firebase ready: provider = mode === 'firebase' ? new FirebaseProvider() : new LocalProvider();
provider = new LocalProvider();

export const data = provider;

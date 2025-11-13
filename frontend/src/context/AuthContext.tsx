import { GoogleAuthProvider, connectAuthEmulator, getAuth, onAuthStateChanged, signInWithCredential, signOut } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { clearGoogleAuthCache, getGoogleAccessAndProfile } from '../auth/google';
import { getFirebaseApp } from '../firebase/app';
import type { AppUser } from '../types/User';
import { fetchUser, upsertUserProfile } from '../services/usersService';

type AuthState = {
  user: AppUser | null;
  accessToken?: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error?: string;
  refreshProfile?: () => Promise<void>;
};

const auth = getAuth(getFirebaseApp());
const shouldUseEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
if (shouldUseEmulator) {
  const url = import.meta.env.VITE_AUTH_EMULATOR_URL ?? 'http://127.0.0.1:9099';
  connectAuthEmulator(auth, url, { disableWarnings: true });
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const hydrateUser = useCallback(async (uid: string) => {
    const existing = await fetchUser(uid);
    if (existing) {
      setUser(existing);
      return existing;
    }
    return null;
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { accessToken: googleToken, profile, idToken } = await getGoogleAccessAndProfile();
      if (!idToken) throw new Error('Missing Google ID token');
      setAccessToken(googleToken);
      const credential = GoogleAuthProvider.credential(idToken, googleToken);
      await signInWithCredential(auth, credential);
      const record = await upsertUserProfile({
        id: profile.sub,
        name: profile.name || 'Student',
        email: profile.email || '',
        role: 'student',
        photoURL: profile.picture,
        clubsJoined: []
      });
      setUser(record);
    } catch (err: any) {
      setError(err?.message ?? 'Authentication failed');
      setAccessToken(undefined);
      clearGoogleAuthCache();
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setAccessToken(undefined);
    setError(undefined);
    clearGoogleAuthCache();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const fresh = await hydrateUser(user.id);
    if (fresh) setUser(fresh);
  }, [hydrateUser, user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAccessToken(undefined);
        setLoading(false);
        return;
      }
      const record =
        (await hydrateUser(fbUser.uid)) ??
        (await upsertUserProfile({
          id: fbUser.uid,
          name: fbUser.displayName ?? 'Student',
          email: fbUser.email ?? '',
          role: 'student',
          photoURL: fbUser.photoURL ?? undefined,
          clubsJoined: []
        }));
      setUser(record);
      setLoading(false);
    });
    return () => unsub();
  }, [hydrateUser]);

  useEffect(() => {
    if (!user || accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { accessToken: token } = await getGoogleAccessAndProfile();
        if (!cancelled) setAccessToken(token);
      } catch (err) {
        console.warn('Silent Google token fetch failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      login,
      logout,
      loading,
      error,
      refreshProfile
    }),
    [user, accessToken, login, logout, loading, error, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

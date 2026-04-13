import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { clearGoogleAuthCache, getGoogleAccessAndProfile } from '../auth/google';
import { getFirebaseApp } from '../firebase/app';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';
import { isAllowedSchoolEmail, normalizeUserRole } from '../lib/policy';
import type { AppUser } from '../types/User';
import { fetchUser, upsertUserProfile } from '../services/usersService';

type AuthState = {
  user: AppUser | null;
  accessToken?: string;
  login: () => Promise<void>;
  loginWithEmulator?: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error?: string;
  refreshProfile?: () => Promise<void>;
};

const auth = getAuth(getFirebaseApp());
const shouldUseEmulator = isFirebaseEmulatorMode;
const shouldUseEmulatorLogin = shouldUseEmulator;
const AUTH_EMULATOR_KEY = '__convergent_auth_emulator__';
const emulatorFlags = globalThis as typeof globalThis & Record<string, boolean | undefined>;
if (shouldUseEmulator && !emulatorFlags[AUTH_EMULATOR_KEY]) {
  const url = import.meta.env.VITE_AUTH_EMULATOR_URL ?? 'http://127.0.0.1:9099';
  connectAuthEmulator(auth, url, { disableWarnings: true });
  emulatorFlags[AUTH_EMULATOR_KEY] = true;
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
      if (!isAllowedSchoolEmail(profile.email)) {
        throw new Error('Only @doonschool.com accounts are allowed');
      }
      setAccessToken(googleToken);
      const credential = GoogleAuthProvider.credential(idToken, googleToken);
      const signedIn = await signInWithCredential(auth, credential);
      const uid = signedIn.user.uid;
      const existing = await fetchUser(uid);
      const record = await upsertUserProfile({
        id: uid,
        name: profile.name || existing?.name || 'Student',
        email: profile.email || existing?.email || '',
        role: normalizeUserRole(existing?.role),
        photoURL: profile.picture ?? existing?.photoURL,
        clubsJoined: existing?.clubsJoined ?? []
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

  const loginWithEmulator = useCallback(async (email: string, password: string) => {
    if (!shouldUseEmulatorLogin) {
      throw new Error('Emulator login is not enabled.');
    }
    setLoading(true);
    setError(undefined);
    setAccessToken(undefined);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!isAllowedSchoolEmail(normalizedEmail)) {
        throw new Error('Only @doonschool.com accounts are allowed');
      }
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err: any) {
      setError(err?.message ?? 'Emulator authentication failed');
      throw err;
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
      if (!isAllowedSchoolEmail(fbUser.email)) {
        await signOut(auth);
        setUser(null);
        setAccessToken(undefined);
        setError('Only @doonschool.com accounts are allowed');
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

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      login,
      loginWithEmulator: shouldUseEmulatorLogin ? loginWithEmulator : undefined,
      logout,
      loading,
      error,
      refreshProfile
    }),
    [user, accessToken, login, loginWithEmulator, logout, loading, error, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

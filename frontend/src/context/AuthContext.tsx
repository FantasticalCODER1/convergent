import { createContext, useContext, useEffect, useState } from 'react';
import { getGoogleAccessAndProfile, clearGoogleAuthCache } from '../auth/google';
import { data } from '../data';
import type { UserDoc } from '../data/DataProvider';

type AuthState = {
  user: UserDoc | null;
  accessToken?: string;
  login: () => Promise<void>;
  logout: () => void;
  loading: boolean;
  error?: string;
};

const AuthContext = createContext<AuthState>({} as AuthState);
const STORAGE_KEY = 'convergent-user-id';

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDoc | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const login = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { accessToken: token, profile } = await getGoogleAccessAndProfile();
      setAccessToken(token);

      const existing = await data.getUser(profile.sub);
      const nextUser: UserDoc =
        existing ??
        ({
          id: profile.sub,
          name: profile.name || 'Student',
          email: profile.email || '',
          photoURL: profile.picture,
          role: 'student',
          clubsJoined: []
        } satisfies UserDoc);

      nextUser.name = profile.name || nextUser.name;
      nextUser.email = profile.email || nextUser.email;
      nextUser.photoURL = profile.picture || nextUser.photoURL;

      await data.upsertUser(nextUser);
      localStorage.setItem(STORAGE_KEY, nextUser.id);
      setUser(nextUser);
    } catch (e: any) {
      const message = e?.message ?? String(e);
      setError(message === 'PROFILE_FETCH_FAILED' ? 'Could not read your Google profile. Try again or contact an admin.' : message);
      setAccessToken(undefined);
      clearGoogleAuthCache();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setAccessToken(undefined);
    setError(undefined);
    clearGoogleAuthCache();
  };

  useEffect(() => {
    const lastId = localStorage.getItem(STORAGE_KEY);
    if (!lastId) {
      setLoading(false);
      return;
    }
    (async () => {
      const existing = await data.getUser(lastId);
      setUser(existing ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

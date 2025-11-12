import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, provider } from '../firebase';

export type Role = 'student' | 'teacher' | 'admin' | 'manager';

export type AppUser = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  photoURL?: string;
  clubsJoined: string[];
};

export type AuthState = {
  user: AppUser | null;
  accessToken?: string;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const login = async () => {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) setAccessToken(token);

    const currentUser = result.user as User;
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const newUser: AppUser = {
        uid: currentUser.uid,
        name: currentUser.displayName || 'Student',
        email: currentUser.email || '',
        role: 'student',
        photoURL: currentUser.photoURL || '',
        clubsJoined: []
      };
      await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
      setUser(newUser);
    } else {
      setUser(snap.data() as AppUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setAccessToken(undefined);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAccessToken(undefined);
        setLoading(false);
        return;
      }

      const ref = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUser(snap.data() as AppUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

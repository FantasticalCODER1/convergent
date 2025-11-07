/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Authentication context bridging Firebase Auth with the React component tree.
// TODO: Persist roles per user from Firestore and integrate analytics-based onboarding flows.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase/firebaseConfig.js';
import { ROLES } from '../utils/roles.js';

const GOOGLE_DOMAIN = 'doonschool.com';
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: GOOGLE_DOMAIN, prompt: 'select_account' });

const AuthContext = createContext({
  user: null,
  role: ROLES.STUDENT,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  clearError: () => {}
});

function formatUser(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName ?? 'Convergent Member',
    email: firebaseUser.email ?? '',
    photoURL: firebaseUser.photoURL ?? ''
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(ROLES.STUDENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sessionSyncedRef = useRef(false);

  const refreshUserSession = useMemo(() => httpsCallable(functions, 'refreshUserSession'), [functions]);

  const enforceDomainOrSignOut = useCallback(
    async (firebaseUser) => {
      if (!firebaseUser.email?.toLowerCase().endsWith(`@${GOOGLE_DOMAIN}`)) {
        setError('Please sign in with your @doonschool.com account.');
        await firebaseSignOut(auth);
        return false;
      }
      return true;
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(ROLES.STUDENT);
        setLoading(false);
        sessionSyncedRef.current = false;
        return;
      }

      setLoading(true);
      try {
        const domainAllowed = await enforceDomainOrSignOut(firebaseUser);
        if (!domainAllowed) {
          return;
        }

        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const derivedRole = tokenResult.claims?.role ?? ROLES.STUDENT;
        setUser(formatUser(firebaseUser));
        setRole(derivedRole);
        setError(null);

        if (!sessionSyncedRef.current) {
          await refreshUserSession().catch((sessionError) => {
            console.error('Failed to refresh user session', sessionError);
          });
          sessionSyncedRef.current = true;
        }
      } catch (authError) {
        console.error('Failed to resolve auth claims', authError);
        setError('We could not verify your role. Please try signing in again.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [enforceDomainOrSignOut, refreshUserSession]);

  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const { user: firebaseUser } = await signInWithPopup(auth, provider);

      if (!firebaseUser.email?.toLowerCase().endsWith(`@${GOOGLE_DOMAIN}`)) {
        await firebaseSignOut(auth);
        throw new Error('Please sign in with your @doonschool.com account.');
      }

      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const derivedRole = tokenResult.claims?.role ?? ROLES.STUDENT;

      setUser(formatUser(firebaseUser));
      setRole(derivedRole);
      setError(null);

      if (!sessionSyncedRef.current) {
        await refreshUserSession().catch((sessionError) => {
          console.error('Unable to refresh user session after sign-in', sessionError);
        });
        sessionSyncedRef.current = true;
      }
    } catch (authError) {
      console.error('Sign-in failed', authError);
      setError(
        authError.message === 'Please sign in with your @doonschool.com account.'
          ? authError.message
          : 'Unable to sign in right now. Please retry or contact the administrator.'
      );
    } finally {
      setLoading(false);
    }
  }, [refreshUserSession]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } finally {
      setUser(null);
      setRole(ROLES.STUDENT);
      setError(null);
      sessionSyncedRef.current = false;
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ user, role, loading, error, signIn, signOut, clearError }),
    [user, role, loading, error, signIn, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

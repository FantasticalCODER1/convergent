/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Authentication context bridging Firebase Auth with the React component tree.
// TODO: Persist roles per user from Firestore and integrate analytics-based onboarding flows.

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({
  user: null,
  role: 'student',
  loading: true,
  signIn: async () => {},
  signOut: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Connect to Firebase auth state observer once backend rules are finalized.
    setLoading(false);
  }, []);

  const signIn = async () => {
    setUser({ displayName: 'Demo User', email: 'demo@school.edu' });
    setRole('student');
  };

  const signOut = async () => {
    setUser(null);
    setRole('student');
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

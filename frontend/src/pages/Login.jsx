/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Public login page providing Google SSO entry into the platform.
// TODO: Integrate branded Google button and domain-restriction messaging.

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';

export default function Login() {
  const { signIn, error, clearError, loading } = useAuth();

  useEffect(() => clearError(), [clearError]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-white to-brand/20 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-accent">Welcome to Convergent</h1>
        <p className="mt-3 text-sm text-slate-500">
          Sign in with your school Google account to access clubs, events, and certificates.
        </p>
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={signIn}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-soft transition duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/60"
        >
          {loading ? 'Connecting…' : 'Continue with Google'}
        </button>
        <p className="mt-4 text-xs text-slate-400">
          Only @doonschool.com accounts are permitted. Contact the Convergent admin team for access support.
        </p>
      </div>
    </div>
  );
}

/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Public login page providing Google SSO entry into the platform.
// TODO: Integrate branded Google button and domain-restriction messaging.

import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { signIn } = useAuth();

  return (
    <div className="from-background to-brand/20 flex min-h-screen flex-col items-center justify-center bg-gradient-to-br via-white p-6">
      <div className="shadow-soft w-full max-w-md rounded-3xl bg-white/95 p-8">
        <h1 className="text-accent text-3xl font-semibold">Welcome to Convergent</h1>
        <p className="mt-3 text-sm text-slate-500">
          Sign in with your school Google account to access clubs, events, and certificates.
        </p>
        <button
          type="button"
          onClick={signIn}
          className="bg-brand shadow-soft hover:bg-brand-dark mt-6 w-full rounded-full px-4 py-3 text-sm font-semibold text-white"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

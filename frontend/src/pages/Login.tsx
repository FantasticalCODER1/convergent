import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isGoogleAuthConfigured } from '../auth/google';
import { isFirebaseEmulatorMode } from '../lib/firebaseEnv';

const emulatorUsers = [
  'admin@doonschool.com',
  'master@doonschool.com',
  'manager@doonschool.com',
  'student@doonschool.com'
];

export default function Login() {
  const { login, loginWithEmulator, loading, error, user } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('student@doonschool.com');
  const [password, setPassword] = useState('password123');
  const from = (location.state as any)?.from?.pathname || '/';
  const emulatorLoginEnabled = isFirebaseEmulatorMode && !!loginWithEmulator;
  const googleLoginEnabled = !isFirebaseEmulatorMode && isGoogleAuthConfigured();

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-900 to-slate-900">
      <div className="w-full max-w-lg space-y-5 rounded-3xl border border-white/20 bg-white/10 p-8 text-white shadow-2xl backdrop-blur">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Convergent</p>
          <h1 className="text-3xl font-semibold">Sign in to your co-curricular workspace</h1>
          <p className="text-sm text-white/70">
            {emulatorLoginEnabled
              ? 'Use the seeded local accounts for deterministic emulator validation.'
              : 'Use your school Google account to access clubs, calendar, and certificates.'}
          </p>
        </div>
        {emulatorLoginEnabled ? (
          <div className="space-y-3 rounded-2xl border border-emerald-300/20 bg-emerald-500/5 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Emulator sign-in</p>
              <p className="text-sm text-white/70">Local auth is active. Google token flows only start when a feature explicitly requests them.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {emulatorUsers.map((seededEmail) => (
                <button
                  key={seededEmail}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(seededEmail);
                    void loginWithEmulator?.(seededEmail, password);
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-60"
                >
                  {seededEmail}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                placeholder="student@doonschool.com"
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                placeholder="password123"
                type="password"
              />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loginWithEmulator?.(email, password)}
              className="w-full rounded-full bg-emerald-500 py-3 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Continue with Emulator Auth'}
            </button>
          </div>
        ) : null}
        {googleLoginEnabled ? (
          <button
            disabled={loading}
            onClick={login}
            className="w-full rounded-full bg-indigo-500 py-3 hover:bg-indigo-600 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>
        ) : null}
        {!googleLoginEnabled && !emulatorLoginEnabled ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
            Google sign-in is not configured for this environment yet.
          </div>
        ) : null}
        {error && <div className="text-red-300 text-sm whitespace-pre-wrap">{error}</div>}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getGoogleConfigSummary } from '../auth/google';

const emulatorUsers = [
  'admin@doonschool.com',
  'master@doonschool.com',
  'manager@doonschool.com',
  'student@doonschool.com'
];

export default function Login() {
  const { login, loginWithEmulator, loading, error, user } = useAuth();
  const location = useLocation();
  const cfg = useMemo(() => getGoogleConfigSummary(), []);
  const [email, setEmail] = useState('student@doonschool.com');
  const [password, setPassword] = useState('password123');
  const from = (location.state as any)?.from?.pathname || '/';
  const emulatorLoginEnabled = !!loginWithEmulator && import.meta.env.VITE_ENABLE_EMULATOR_LOGIN === 'true';

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-900 to-slate-900">
      <div className="bg-white/10 p-8 rounded-2xl backdrop-blur border border-white/20 w-full max-w-md text-white space-y-4">
        <h1 className="text-2xl font-semibold">Sign in to Convergent</h1>
        <button
          disabled={loading}
          onClick={login}
          className="w-full py-3 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        {emulatorLoginEnabled ? (
          <div className="space-y-3 rounded-2xl border border-emerald-300/20 bg-emerald-500/5 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Emulator sign-in</p>
              <p className="text-sm text-white/70">Use the seeded local accounts for deterministic validation.</p>
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
        {error && <div className="text-red-300 text-sm whitespace-pre-wrap">{error}</div>}
        <div className="text-xs opacity-70 border-t border-white/10 pt-3">
          <div>Origin: {cfg.origin}</div>
          <div>Client ID present: {String(cfg.clientIdPresent)}</div>
          <div>Client ID suffix OK: {String(cfg.clientIdSuffixOk)}</div>
        </div>
      </div>
    </div>
  );
}

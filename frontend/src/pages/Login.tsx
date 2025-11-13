import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGoogleConfigSummary } from '../auth/google';

export default function Login() {
  const { login, loading, error, user } = useAuth();
  const location = useLocation();
  const cfg = useMemo(() => getGoogleConfigSummary(), []);
  const from = (location.state as any)?.from?.pathname || '/';

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

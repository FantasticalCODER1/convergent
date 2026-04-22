import { type ReactNode, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, CalendarDays, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isGoogleAuthConfigured } from '../auth/google';
import { firebaseRuntimeMode, isFirebaseEmulatorMode } from '../lib/firebaseEnv';

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
  const googleLoginEnabled = firebaseRuntimeMode === 'firebase' && isGoogleAuthConfigured();
  const environmentLabel = emulatorLoginEnabled ? 'Local development mode' : googleLoginEnabled ? 'School Google sign-in' : 'Sign-in not configured';
  const environmentCopy = emulatorLoginEnabled
    ? 'Seeded emulator accounts are active for deterministic validation. Google access only matters when a feature explicitly asks for live Classroom recovery.'
    : googleLoginEnabled
      ? 'School Google accounts can recover live calendar, classes, and certificate links for this environment.'
      : 'This environment does not currently expose a supported sign-in provider.';

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] px-4 py-8 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(86,127,192,0.18),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(28,119,135,0.16),transparent_24%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,43,0.94),rgba(12,18,32,0.94))] shadow-[0_35px_80px_rgba(3,8,22,0.45)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="border-b border-white/8 px-7 py-8 sm:px-10 sm:py-10 lg:border-b-0 lg:border-r">
            <p className="text-[0.74rem] font-medium uppercase tracking-[0.38em] text-[var(--accent-2)]">Convergent</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[var(--text-strong)] sm:text-5xl">
              Sign in to your school operations workspace
            </h1>
            <p className="mt-4 max-w-xl text-[1.04rem] leading-8 text-[var(--text-muted)]">{environmentCopy}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <FeatureBlock
                icon={<CalendarDays className="size-5" />}
                title="Calendar-first"
                body="Month planning, selected-day detail, and school-wide context stay in one place."
              />
              <FeatureBlock
                icon={<GraduationCap className="size-5" />}
                title="Classes"
                body="Timetable truth and Classroom recovery stay separate so the page stays honest."
              />
              <FeatureBlock
                icon={<ShieldCheck className="size-5" />}
                title="Records"
                body="Club certificates and verifiable student records remain available from the same shell."
              />
            </div>

            <div className="mt-8 rounded-[28px] border border-white/8 bg-[rgba(10,15,27,0.34)] p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">Environment</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">{environmentLabel}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
                Local sign-in and live school sign-in are intentionally explained separately here so the user understands what the app can truthfully recover in the current environment.
              </p>
            </div>
          </section>

          <section className="px-7 py-8 sm:px-10 sm:py-10">
            <div className="max-w-md">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">
                {emulatorLoginEnabled ? 'Seeded access' : googleLoginEnabled ? 'Google access' : 'Access status'}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-strong)]">
                {emulatorLoginEnabled ? 'Use a seeded school account' : googleLoginEnabled ? 'Continue with your school Google account' : 'Sign-in provider unavailable'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                {emulatorLoginEnabled
                  ? 'Quick-select a seeded identity or edit the credentials below before signing in.'
                  : googleLoginEnabled
                    ? 'Google sign-in is the only supported production-style path in this mode.'
                    : firebaseRuntimeMode === 'unconfigured'
                      ? 'Firebase configuration is missing. In local work, start the supported emulator-backed flow instead.'
                      : 'Google sign-in is not configured for this environment yet.'}
              </p>
            </div>

            {emulatorLoginEnabled ? (
              <div className="mt-8 space-y-5">
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
                      className="rounded-[18px] border border-white/10 bg-[rgba(13,19,34,0.5)] px-4 py-3 text-left text-sm text-[var(--text-strong)] transition hover:bg-[rgba(22,31,53,0.72)] disabled:opacity-60"
                    >
                      {seededEmail}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4">
                  <label className="space-y-2 text-sm">
                    <span className="text-[var(--text-muted)]">Email</span>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-[18px] border border-white/10 bg-[rgba(13,19,34,0.5)] px-4 py-3 text-[var(--text-strong)]"
                      placeholder="student@doonschool.com"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-[var(--text-muted)]">Password</span>
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-[18px] border border-white/10 bg-[rgba(13,19,34,0.5)] px-4 py-3 text-[var(--text-strong)]"
                      placeholder="password123"
                      type="password"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loginWithEmulator?.(email, password)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:opacity-60"
                >
                  {loading ? 'Signing in…' : 'Continue with local school account'}
                  {!loading ? <ArrowRight className="size-4" /> : null}
                </button>
              </div>
            ) : null}

            {googleLoginEnabled ? (
              <button
                disabled={loading}
                onClick={login}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Continue with Google'}
                {!loading ? <ArrowRight className="size-4" /> : null}
              </button>
            ) : null}

            {!googleLoginEnabled && !emulatorLoginEnabled ? (
              <div className="mt-8 rounded-[24px] border border-amber-300/20 bg-[rgba(62,45,31,0.42)] p-5 text-sm leading-7 text-amber-50">
                {firebaseRuntimeMode === 'unconfigured'
                  ? 'Firebase configuration is missing for this environment. In local development, run the supported emulator-backed flow before testing sign-in.'
                  : 'Google sign-in is not configured for this environment yet.'}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-[22px] border border-rose-300/20 bg-[rgba(78,33,43,0.48)] p-4 text-sm leading-7 text-rose-100">
                {error}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function FeatureBlock({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-[rgba(10,15,27,0.32)] p-4">
      <span className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-[rgba(21,29,48,0.74)] text-[var(--text-strong)]">
        {icon}
      </span>
      <p className="mt-4 text-lg font-semibold text-[var(--text-strong)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{body}</p>
    </div>
  );
}

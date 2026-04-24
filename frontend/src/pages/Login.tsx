import { type ReactNode, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, CalendarDays, GraduationCap, ShieldCheck } from 'lucide-react';
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
    ? 'Use a seeded account while Firebase emulators are running.'
    : googleLoginEnabled
      ? 'Use your school Google account to open calendar, classes, clubs, and records.'
      : 'This environment does not currently expose a supported sign-in provider.';

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="px-1 py-4 sm:px-2 lg:pr-8">
            <div className="flex items-center gap-3">
              <div className="identity-serif flex size-11 items-center justify-center rounded-[10px] border border-[color:var(--line-strong)] bg-[var(--paper-card)] text-[1.15rem] text-[var(--academic-blue)] shadow-[var(--shadow-soft)]">C</div>
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--brass)]">Convergent</p>
                <p className="mt-0.5 text-sm font-medium text-[var(--text-muted)]">Spring Term 2026</p>
              </div>
            </div>
            <h1 className="serif-display mt-6 max-w-xl text-[2.65rem] font-semibold leading-tight text-[var(--text-strong)] sm:text-[3rem]">
              Sign in to Convergent
            </h1>
            <p className="mt-4 max-w-xl text-[1rem] leading-7 text-[var(--text-muted)]">
              School calendar, classes, clubs, and records in one workspace.
            </p>

            <div className="mt-7 space-y-3">
              <FeatureBlock
                icon={<CalendarDays className="size-5" />}
                title="Planner"
                body="Classes, meals, clubs, and school events."
              />
              <FeatureBlock
                icon={<GraduationCap className="size-5" />}
                title="Classes"
                body="Timetable records and attached Classroom context."
              />
              <FeatureBlock
                icon={<ShieldCheck className="size-5" />}
                title="Records"
                body="Certificate ledger and verification links."
              />
            </div>

            <div className="mt-7 rounded-[12px] border border-[color:var(--academic-blue-line)] bg-[var(--academic-blue-soft)] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">Access mode</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">{environmentLabel}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{environmentCopy}</p>
            </div>
          </section>

          <section className="rounded-[14px] border border-[color:var(--line)] bg-[rgba(255,253,248,0.9)] px-7 py-8 shadow-[var(--shadow-soft)] sm:px-10 sm:py-10">
            <div className="max-w-md">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
                {emulatorLoginEnabled ? 'Local development accounts' : googleLoginEnabled ? 'Google access' : 'Access status'}
              </p>
              <h2 className="serif-display mt-2 text-[2rem] font-semibold leading-tight text-[var(--text-strong)]">
                {emulatorLoginEnabled ? 'Choose an account' : googleLoginEnabled ? 'Continue with your school Google account' : 'Sign-in provider unavailable'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {emulatorLoginEnabled
                  ? 'Use a seeded account while Firebase emulators are running.'
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
                      className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-left text-sm text-[var(--text-strong)] transition hover:bg-white disabled:opacity-60"
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
                      className="w-full rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-4 py-3 text-[var(--text-strong)]"
                      placeholder="student@doonschool.com"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-[var(--text-muted)]">Password</span>
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-4 py-3 text-[var(--text-strong)]"
                      placeholder="password123"
                      type="password"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loginWithEmulator?.(email, password)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--academic-blue)] px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
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
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--academic-blue)] px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Continue with Google'}
                {!loading ? <ArrowRight className="size-4" /> : null}
              </button>
            ) : null}

            {!googleLoginEnabled && !emulatorLoginEnabled ? (
              <div className="mt-8 rounded-[10px] border border-[color:var(--gold-line)] bg-[var(--gold-soft)] p-5 text-sm leading-7 text-[var(--brass)]">
                {firebaseRuntimeMode === 'unconfigured'
                  ? 'Firebase configuration is missing for this environment. In local development, run the supported emulator-backed flow before testing sign-in.'
                  : 'Google sign-in is not configured for this environment yet.'}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-[10px] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800">
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
    <div className="flex items-start gap-3 border-l-2 border-[color:var(--line-strong)] bg-[rgba(255,253,248,0.48)] px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-[color:var(--line)] bg-[var(--paper-card)] text-[var(--academic-blue)]">
        {icon}
      </span>
      <div>
        <p className="text-base font-semibold text-[var(--text-strong)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{body}</p>
      </div>
    </div>
  );
}

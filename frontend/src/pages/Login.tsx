import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-between gap-8 px-6">
        <motion.div
          className="space-y-6 text-white md:w-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Convergent</p>
          <h1 className="text-4xl font-semibold leading-tight">
            One login for <span className="text-indigo-300">clubs</span>, classes, events, and certificates.
          </h1>
          <p className="text-white/70">
            Sign in with Google to sync your Classroom courses, RSVP to events on Calendar, and manage campus life from
            a single dashboard.
          </p>
          <button
            type="button"
            onClick={login}
            className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Continue with Google
          </button>
        </motion.div>
        <motion.div
          className="hidden flex-1 rounded-[40px] border border-white/10 bg-white/5 p-8 text-white/80 shadow-glass md:block"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">Scopes requested</p>
            <ul className="space-y-2 text-sm">
              <li>• Google Classroom courses & coursework (read)</li>
              <li>• Google Calendar primary calendar (events insert)</li>
            </ul>
            <p className="text-xs text-white/50">
              Accepting the prompt grants Convergent access tokens used only while you are signed in to fetch courses and
              create events on demand.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

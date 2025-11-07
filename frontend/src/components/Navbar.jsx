/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Top navigation bar responsible for session controls and quick identity cues.
// TODO: Extend with notification center and real-time alert badges.

import { useAuth } from '../context/AuthContext.js';
import { ROLE_LABELS } from '../utils/roles.js';

export default function Navbar() {
  const { user, role, signOut, loading } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-4 shadow-soft backdrop-blur-md">
      <h1 className="text-xl font-semibold text-accent">Convergent</h1>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="h-10 w-10 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-accent">
                {user.displayName.slice(0, 1)}
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-accent shadow-soft">
              {ROLE_LABELS[role] ?? 'Student'}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          disabled={loading}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/60"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

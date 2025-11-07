/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Top navigation bar responsible for session controls and quick identity cues.
// TODO: Extend with notification center and real-time alert badges.

import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="shadow-soft sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-md">
      <h1 className="text-accent text-xl font-semibold">Convergent</h1>
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          className="bg-brand shadow-soft hover:bg-brand-dark rounded-full px-4 py-2 text-sm font-semibold text-white"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

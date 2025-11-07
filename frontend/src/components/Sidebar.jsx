/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Sidebar navigation rendering global sections with active-state highlighting.
// TODO: Surface analytics shortcuts and mobile responsive drawer variant.

import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/clubs', label: 'Clubs' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/certificates', label: 'Certificates' },
  { to: '/admin', label: 'Admin Panel' }
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white/80 p-6 shadow-soft md:block">
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2 text-sm font-semibold transition duration-250 hover:bg-brand/10 ${
                isActive ? 'bg-brand/15 text-accent shadow-soft' : 'text-slate-700'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

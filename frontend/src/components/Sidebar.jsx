/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Sidebar navigation rendering global sections with active-state highlighting.
// TODO: Surface analytics shortcuts and mobile responsive drawer variant.

import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ROLES } from '../utils/roles.js';

const ROLE_ORDER = [ROLES.STUDENT, ROLES.MANAGER, ROLES.MASTER, ROLES.ADMIN];
const ROLE_INDEX = ROLE_ORDER.reduce((accumulator, currentRole, index) => {
  accumulator[currentRole] = index;
  return accumulator;
}, {});

const LINKS = [
  { to: '/', label: 'Dashboard', minimumRole: ROLES.STUDENT },
  { to: '/clubs', label: 'Clubs', minimumRole: ROLES.STUDENT },
  { to: '/calendar', label: 'Calendar', minimumRole: ROLES.STUDENT },
  { to: '/certificates', label: 'Certificates', minimumRole: ROLES.STUDENT },
  { to: '/admin', label: 'Admin Panel', minimumRole: ROLES.ADMIN }
];

function canAccess(role, minimumRole) {
  const userIndex = ROLE_INDEX[role] ?? ROLE_INDEX[ROLES.STUDENT];
  const requiredIndex = ROLE_INDEX[minimumRole] ?? ROLE_INDEX[ROLES.STUDENT];
  return userIndex >= requiredIndex;
}

export default function Sidebar() {
  const { role } = useAuth();
  const visibleLinks = LINKS.filter((link) => canAccess(role, link.minimumRole));

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white/80 p-6 shadow-soft md:block">
      <nav className="flex flex-col gap-2">
        {visibleLinks.map((link) => (
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

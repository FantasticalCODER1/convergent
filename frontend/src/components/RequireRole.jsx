/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Role-protected route wrapper ensuring only authorized roles can access specific views.
// TODO: Integrate loading skeletons and audit logging for denied transitions.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ROLES } from '../utils/roles.js';

const ROLE_ORDER = [ROLES.STUDENT, ROLES.MANAGER, ROLES.MASTER, ROLES.ADMIN];
const ROLE_INDEX = ROLE_ORDER.reduce((map, currentRole, index) => {
  map[currentRole] = index;
  return map;
}, {});

function expandRoles(minimumRole) {
  const startIndex = ROLE_INDEX[minimumRole] ?? ROLE_INDEX[ROLES.STUDENT];
  return ROLE_ORDER.slice(startIndex);
}

export default function RequireRole({ children, allowedRoles, minimumRole = ROLES.STUDENT }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const rolesToCheck = allowedRoles ?? expandRoles(minimumRole);

  if (loading) {
    return <div className="py-20 text-center text-sm font-medium text-slate-500">Verifying your access…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!rolesToCheck.includes(role)) {
    return <Navigate to="/" replace state={{ denied: true, from: location }} />;
  }

  return children;
}

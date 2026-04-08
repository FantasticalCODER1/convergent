import { Navigate } from 'react-router-dom';
import { canAccessRole } from '../lib/policy';
import type { UserRole } from '../types/User';
import { useAuth } from '../hooks/useAuth';

export default function RequireRole({ role, children }: { role: UserRole; children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-sm opacity-80">Loading access…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (canAccessRole(user.role, role)) return children;
  return <Navigate to="/unauthorised" replace />;
}

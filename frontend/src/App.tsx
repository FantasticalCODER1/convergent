import { Suspense, lazy, type ComponentType, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, NavLink as RouterNavLink } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import RequireRole from './components/RequireRole';
import RequireAuth from './components/RequireAuth';
import { CalendarDays, Home, NotebookPen, Shield, Trophy, UsersRound } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clubs = lazy(() => import('./pages/Clubs'));
const ClubDetail = lazy(() => import('./pages/ClubDetail'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Certificates = lazy(() => import('./pages/Certificates'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Classes = lazy(() => import('./pages/Classes'));
const Login = lazy(() => import('./pages/Login'));
const Verify = lazy(() => import('./pages/Verify'));
const DevSeed = lazy(() => import('./pages/DevSeed'));
const DebugOAuth = lazy(() => import('./pages/DebugOAuth'));

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/clubs', label: 'Clubs', icon: UsersRound },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/classes', label: 'Classes', icon: NotebookPen },
  { to: '/certificates', label: 'Certificates', icon: Trophy },
  { to: '/admin', label: 'Admin', icon: Shield }
];

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/debug/oauth" element={<DebugOAuth />} />
        <Route path="/verify" element={<Verify />} />
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminPanel />
              </RequireRole>
            }
          />
          {import.meta.env.DEV && <Route path="/dev/seed" element={<DevSeed />} />}
          <Route path="/unauthorised" element={<div className="p-8">No access</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  return <div className="grid min-h-screen place-items-center bg-slate-950 text-white/70">Loading…</div>;
}

function Shell() {
  const { user, logout } = useAuth();
  const visibleNavLinks = navLinks.filter((link) => link.to !== '/admin' || user?.role === 'admin');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Convergent</p>
            <p className="text-lg font-semibold text-white/90">Unified co-curricular platform</p>
          </div>
          {user ? <ProfileDropdown userName={user.name} userEmail={user.email} userRole={user.role} onSignOut={logout} /> : null}
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8 md:px-6">
        <aside className="glass-card hidden w-60 shrink-0 flex-col space-y-2 p-4 md:flex">
          {visibleNavLinks.map((link) => (
            <NavLink key={link.to} to={link.to} icon={link.icon} label={link.label} />
          ))}
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProfileDropdown({ userName, userEmail, userRole, onSignOut }: { userName: string; userEmail: string; userRole: string; onSignOut: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white/80 transition hover:bg-white/10"
      >
        <div className="text-right leading-tight">
          <p className="font-semibold text-white">{userName}</p>
          <p className="text-xs text-white/60">{userRole}</p>
        </div>
        <span aria-hidden className="text-white/60">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-sm shadow-xl">
          <p className="font-semibold text-white">{userName}</p>
          <p className="text-white/60">{userEmail}</p>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => onSignOut()}
              className="w-full rounded-xl border border-white/10 px-4 py-2 text-left text-white/80 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({ to, label, icon: Icon }: { to: string; label: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors ${
          isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
        }`
      }
    >
      <Icon className="size-4" />
      {label}
    </RouterNavLink>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

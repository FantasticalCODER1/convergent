import { type ComponentType } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, NavLink as RouterNavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import CalendarPage from './pages/CalendarPage';
import Certificates from './pages/Certificates';
import AdminPanel from './pages/AdminPanel';
import Classes from './pages/Classes';
import Login from './pages/Login';
import Verify from './pages/Verify';
import DevSeed from './pages/DevSeed';
import RequireRole from './components/RequireRole';
import RequireAuth from './components/RequireAuth';
import { CalendarDays, Home, NotebookPen, Shield, Trophy, UsersRound } from 'lucide-react';
import DebugOAuth from './pages/DebugOAuth';

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
  );
}

function Shell() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Convergent</p>
            <p className="text-lg font-semibold text-white/90">Unified co-curricular platform</p>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right text-sm leading-tight text-white/80">
                <p className="font-semibold">{user.name}</p>
                <p className="text-white/60">{user.role}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8 md:px-6">
        <aside className="glass-card hidden w-60 shrink-0 flex-col space-y-2 p-4 md:flex">
          {navLinks.map((link) => (
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

import { Suspense, lazy, type ComponentType, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileSetupGate } from './components/ProfileSetupGate';
import { useAuth } from './hooks/useAuth';
import RequireRole from './components/RequireRole';
import RequireAuth from './components/RequireAuth';
import { CalendarDays, Home, MoreHorizontal, NotebookPen, Shield, Trophy, UserRoundCheck, UsersRound } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clubs = lazy(() => import('./pages/Clubs'));
const MyClubs = lazy(() => import('./pages/MyClubs'));
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
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/join-clubs', label: 'Join Clubs', icon: UsersRound },
  { to: '/my-clubs', label: 'My Clubs', icon: UserRoundCheck },
  { to: '/classes', label: 'Classes', icon: NotebookPen },
  { to: '/certificates', label: 'Certificates', icon: Trophy },
  { to: '/admin', label: 'Admin', icon: Shield }
];

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        {import.meta.env.DEV && <Route path="/debug/oauth" element={<DebugOAuth />} />}
        <Route path="/verify" element={<Verify />} />
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/join-clubs" element={<Clubs />} />
          <Route path="/my-clubs" element={<MyClubs />} />
          <Route path="/my-clubs/:id" element={<ClubDetail />} />
          <Route path="/clubs" element={<Navigate to="/join-clubs" replace />} />
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
  const { user, logout, refreshProfile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavLinks = navLinks.filter((link) => link.to !== '/admin' || user?.role === 'admin');
  const primaryMobileLinks = visibleNavLinks.filter((link) =>
    ['/calendar', '/dashboard', '/join-clubs', '/my-clubs'].includes(link.to)
  );
  const moreLinks = visibleNavLinks.filter((link) => !primaryMobileLinks.some((primaryLink) => primaryLink.to === link.to));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Convergent</p>
            <p className="text-lg font-semibold text-white/90">The school&apos;s central time-and-structure platform</p>
          </div>
          {user ? (
            <ProfileDropdown
              userName={user.name}
              userEmail={user.email}
              userRole={user.role}
              userGrade={user.grade}
              userSection={user.section}
              onSignOut={logout}
            />
          ) : null}
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8 pb-28 md:px-6 md:pb-8">
        <aside className="glass-card hidden w-60 shrink-0 flex-col space-y-2 p-4 md:flex">
          {visibleNavLinks.map((link) => (
            <NavLink key={link.to} to={link.to} icon={link.icon} label={link.label} />
          ))}
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <MobileNav
        open={mobileMenuOpen}
        onToggle={() => setMobileMenuOpen((value) => !value)}
        primaryLinks={primaryMobileLinks}
        moreLinks={moreLinks}
      />
      <ProfileSetupGate user={user} onComplete={refreshProfile} />
    </div>
  );
}

function ProfileDropdown({
  userName,
  userEmail,
  userRole,
  userGrade,
  userSection,
  onSignOut
}: {
  userName: string;
  userEmail: string;
  userRole: string;
  userGrade?: string;
  userSection?: string;
  onSignOut: () => Promise<void> | void;
}) {
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
          <p className="text-xs text-white/60">
            {userRole}
            {userGrade || userSection ? ` · ${[userGrade, userSection].filter(Boolean).join(' / ')}` : ''}
          </p>
        </div>
        <span aria-hidden className="text-white/60">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-sm shadow-xl">
          <p className="font-semibold text-white">{userName}</p>
          <p className="text-white/60">{userEmail}</p>
          <p className="mt-1 text-xs text-white/45">{userGrade && userSection ? `${userGrade} · ${userSection}` : 'Grade and section still needed for timetable mapping'}</p>
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

function MobileNav({
  open,
  onToggle,
  primaryLinks,
  moreLinks
}: {
  open: boolean;
  onToggle: () => void;
  primaryLinks: typeof navLinks;
  moreLinks: typeof navLinks;
}) {
  return (
    <div className="md:hidden">
      {open && moreLinks.length > 0 ? (
        <div className="fixed inset-x-4 bottom-20 z-50 rounded-3xl border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur-xl">
          <p className="px-2 pb-2 text-xs uppercase tracking-[0.25em] text-white/45">More</p>
          <div className="space-y-1">
            {moreLinks.map((link) => (
              <NavLink key={link.to} to={link.to} icon={link.icon} label={link.label} />
            ))}
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-2">
          {primaryLinks.map((link) => (
            <RouterNavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                }`
              }
            >
              <link.icon className="size-4" />
              <span>{link.label}</span>
            </RouterNavLink>
          ))}
          <button
            type="button"
            onClick={onToggle}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition ${
              open ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <MoreHorizontal className="size-4" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
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

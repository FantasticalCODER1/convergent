import { Suspense, lazy, type ComponentType, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
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
  return <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text-muted)]">Loading...</div>;
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
    <div className="min-h-screen text-[var(--text)]">
      <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[rgba(247,241,231,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="identity-serif flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[color:var(--line-strong)] bg-[var(--paper-card)] text-[1.15rem] text-[var(--academic-blue)] shadow-[var(--shadow-soft)]">
              C
            </div>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--brass)]">Convergent</p>
              <p className="mt-0.5 max-w-xl text-[0.95rem] font-semibold leading-5 text-[var(--text-strong)]">
                Spring Term 2026 · School year 2025-26
              </p>
            </div>
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
      <div className="mx-auto flex w-full max-w-[1480px] gap-5 px-4 py-4 pb-28 md:px-6 md:pb-7">
        <aside className="hidden h-[calc(100vh-5.9rem)] w-[218px] shrink-0 flex-col border-r border-[color:var(--line)] bg-[rgba(255,253,248,0.42)] py-3 pr-4 md:sticky md:top-[76px] md:flex">
          <p className="px-2 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-[var(--brass)]">Workspace</p>
          <div className="mt-3 space-y-1">
            {visibleNavLinks.map((link) => (
              <NavLink key={link.to} to={link.to} icon={link.icon} label={link.label} />
            ))}
          </div>
          <div className="mt-auto border-t border-[color:var(--line)] pt-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">Student context</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">S-Form / IB · Doon School</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Planner, timetable, club access, records.</p>
          </div>
        </aside>
        <main className="page-halo min-w-0 flex-1">
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
        className="flex items-center gap-3 rounded-[12px] border border-[color:var(--line)] bg-[var(--paper-card)] px-3.5 py-2 text-left text-sm text-[var(--text)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--panel-2)]"
      >
        <div className="text-right leading-tight">
          <p className="font-semibold text-[var(--text-strong)]">{userName}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {userRole}
            {userGrade || userSection ? ` · ${[userGrade, userSection].filter(Boolean).join(' / ')}` : ''}
          </p>
        </div>
        <span aria-hidden className="text-[var(--text-faint)]">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-[14px] border border-[color:var(--line)] bg-[var(--paper-card)] p-4 text-sm shadow-[var(--shadow-soft)]">
          <p className="font-semibold text-[var(--text-strong)]">{userName}</p>
          <p className="text-[var(--text-muted)]">{userEmail}</p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {userGrade && userSection ? `${userGrade} · ${userSection}` : 'Grade and section still needed for timetable mapping'}
          </p>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => onSignOut()}
              className="w-full rounded-[10px] border border-[color:var(--line)] px-4 py-2.5 text-left text-[var(--text)] transition hover:bg-[color:var(--panel-2)]"
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
      className={({ isActive }) => clsx('group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition', {
        'bg-[var(--academic-blue-soft)] text-[var(--academic-blue)]': isActive,
        'text-[var(--text-muted)] hover:bg-[color:var(--paper-soft)] hover:text-[var(--text-strong)]': !isActive
      })}
    >
      <span className="flex size-8 items-center justify-center rounded-[9px] border border-[color:var(--line)] bg-[color:var(--panel)]">
        <Icon className="size-4" />
      </span>
      <span>{label}</span>
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
        <div className="fixed inset-x-4 bottom-24 z-50 rounded-[16px] border border-[color:var(--line)] bg-[rgba(255,253,248,0.96)] p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <p className="px-2 pb-2 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-faint)]">More</p>
          <div className="space-y-1">
            {moreLinks.map((link) => (
              <NavLink key={link.to} to={link.to} icon={link.icon} label={link.label} />
            ))}
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-3 bottom-0 z-50 mb-3 rounded-[16px] border border-[color:var(--line)] bg-[rgba(255,253,248,0.96)] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.4rem)] pt-3 shadow-[var(--shadow-soft)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-2">
          {primaryLinks.map((link) => (
            <RouterNavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => clsx('flex flex-col items-center justify-center gap-1 rounded-[12px] px-2 py-2 text-[11px] font-medium transition', {
                'bg-[var(--academic-blue-soft)] text-[var(--academic-blue)]': isActive,
                'text-[var(--text-muted)] hover:text-[var(--text-strong)]': !isActive
              })}
            >
              <link.icon className="size-4" />
              <span>{link.label}</span>
            </RouterNavLink>
          ))}
          <button
            type="button"
            onClick={onToggle}
            className={clsx('flex flex-col items-center justify-center gap-1 rounded-[12px] px-2 py-2 text-[11px] font-medium transition', {
              'bg-[var(--academic-blue-soft)] text-[var(--academic-blue)]': open,
              'text-[var(--text-muted)] hover:text-[var(--text-strong)]': !open
            })}
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

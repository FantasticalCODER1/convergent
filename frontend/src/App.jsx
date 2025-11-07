/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Core application shell defining navigation, layout chrome, and role-aware routing.
// TODO: Expand layout with real-time notifications and activity digests powered by AI summaries.

import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Clubs from './pages/Clubs.jsx';
import ClubDetail from './pages/ClubDetail.jsx';
import CalendarPage from './pages/Calendar.jsx';
import Certificates from './pages/Certificates.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import RequireRole from './components/RequireRole.jsx';
import { useAuth } from './context/AuthContext.js';
import { ROLES } from './utils/roles.js';

const BASE_ROLES = [ROLES.STUDENT, ROLES.MANAGER, ROLES.MASTER, ROLES.ADMIN];

export default function App() {
  const { user, loading } = useAuth();
  const isAuthenticated = Boolean(user);

  if (loading && !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-slate-500">Preparing your workspace…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? (
        <div className="flex">
          <Sidebar />
          <div className="flex-1 bg-background/60">
            <Navbar />
            <main className="p-6">
              <Routes>
                <Route
                  path="/"
                  element={
                    <RequireRole allowedRoles={BASE_ROLES}>
                      <Dashboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="/clubs"
                  element={
                    <RequireRole allowedRoles={BASE_ROLES}>
                      <Clubs />
                    </RequireRole>
                  }
                />
                <Route
                  path="/clubs/:id"
                  element={
                    <RequireRole allowedRoles={BASE_ROLES}>
                      <ClubDetail />
                    </RequireRole>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <RequireRole allowedRoles={BASE_ROLES}>
                      <CalendarPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/certificates"
                  element={
                    <RequireRole allowedRoles={BASE_ROLES}>
                      <Certificates />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RequireRole minimumRole={ROLES.ADMIN}>
                      <AdminPanel />
                    </RequireRole>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  );
}

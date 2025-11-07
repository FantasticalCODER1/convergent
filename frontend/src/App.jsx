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
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  return (
    <div className="bg-background min-h-screen">
      {isAuthenticated ? (
        <div className="flex">
          <Sidebar />
          <div className="bg-background/60 flex-1">
            <Navbar />
            <main className="p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clubs" element={<Clubs />} />
                <Route path="/clubs/:id" element={<ClubDetail />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/certificates" element={<Certificates />} />
                <Route path="/admin" element={<AdminPanel />} />
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

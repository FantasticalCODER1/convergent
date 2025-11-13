import { useEffect, useState } from 'react';
import RequireRole from '../components/RequireRole';
import type { AppUser, UserRole } from '../types/User';
import { listUsers, updateUserRole } from '../services/usersService';
import { useEvents } from '../hooks/useEvents';
import { ClubEditor } from '../components/admin/ClubEditor';
import { EventEditor } from '../components/admin/EventEditor';
import { CertificateUploader } from '../components/admin/CertificateUploader';
import { CalendarImporter } from '../components/admin/CalendarImporter';

export default function AdminPanel() {
  return (
    <RequireRole role="admin">
      <AdminInner />
    </RequireRole>
  );
}

function AdminInner() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { saveEvent, refresh: refreshEvents } = useEvents({ autoLoad: false });

  const loadUsers = async () => {
    setLoading(true);
    const records = await listUsers();
    setUsers(records);
    setLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const changeRole = async (id: string, role: UserRole) => {
    await updateUserRole(id, role);
    await loadUsers();
  };

  const handleManualEvent = async (payload: Parameters<typeof saveEvent>[0]) => {
    await saveEvent(payload);
    await refreshEvents();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Control</p>
        <h1 className="text-3xl font-semibold text-white">Admin panel</h1>
        <p className="text-white/60">Manage access, clubs, events, and imports.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClubEditor onCreated={refreshEvents} />
        <EventEditor onSave={handleManualEvent} />
        <CertificateUploader users={users} onIssued={loadUsers} />
        <CalendarImporter />
      </div>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        <div>
          <h2 className="text-xl font-semibold text-white">Users</h2>
          <p className="text-sm text-white/60">Update roles to control privileged access.</p>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-white/10 p-4 text-white/70">Loading users…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((user) => (
              <div key={user.id} className="rounded-3xl border border-white/5 bg-white/10 p-4">
                <p className="text-lg font-semibold text-white">{user.name || 'Unnamed user'}</p>
                <p className="text-sm text-white/60">{user.email}</p>
                <select
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-accent"
                  value={user.role}
                  onChange={(event) => changeRole(user.id, event.target.value as UserRole)}
                >
                  {['student', 'manager', 'teacher', 'admin'].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

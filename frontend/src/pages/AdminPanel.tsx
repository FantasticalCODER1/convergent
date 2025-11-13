import { useEffect, useState } from 'react';
import RequireRole from '../components/RequireRole';
import type { Role, UserDoc } from '../data/DataProvider';
import { data } from '../data';

type ManagedUser = UserDoc;

export default function AdminPanel() {
  return (
    <RequireRole role="admin">
      <AdminInner />
    </RequireRole>
  );
}

function AdminInner() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    const records = await data.listUsers();
    setUsers(records);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changeRole = async (id: string, role: Role) => {
    await data.updateUserRole(id, role);
    await loadUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Control</p>
        <h1 className="text-3xl font-semibold text-white">Admin panel</h1>
        <p className="text-white/60">Manage access and review user accounts.</p>
      </div>
      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Loading users…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {users.map((user) => (
            <div key={user.id} className="rounded-3xl border border-white/5 bg-white/10 p-4">
              <p className="text-lg font-semibold text-white">{user.name || 'Unnamed user'}</p>
              <p className="text-sm text-white/60">{user.email}</p>
              <select
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-accent"
                value={user.role}
                onChange={(event) => changeRole(user.id, event.target.value as Role)}
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
    </div>
  );
}

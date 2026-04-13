import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RequireRole from '../components/RequireRole';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { EventEditor } from '../components/admin/EventEditor';
import type { AppUser, UserRole } from '../types/User';
import { listUsers, updateUserRole } from '../services/usersService';
import { ClubEditor } from '../components/admin/ClubEditor';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { useSchedules } from '../hooks/useSchedules';
import { formatDateTimeRange } from '../lib/formatters';
import type { EventRecord } from '../types/Event';

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
  const [roleStatus, setRoleStatus] = useState<string | null>(null);
  const [editingSchoolEvent, setEditingSchoolEvent] = useState<EventRecord | null>(null);
  const { clubs, refresh: refreshClubs } = useClubs();
  const { events, saveEvent } = useEvents();
  const { datasets } = useSchedules();
  const schoolEvents = events.filter((event) => !event.relatedGroupId && !event.clubId);

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
    setRoleStatus('Updating role…');
    await updateUserRole(id, role);
    await loadUsers();
    setRoleStatus('Role updated.');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Control</p>
        <h1 className="text-3xl font-semibold text-white">Admin panel</h1>
        <p className="text-white/60">Manage global access and create new clubs. Club-scoped operations now live on each club page.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Users" value={String(users.length)} hint="Accounts with role data" />
        <Metric label="Clubs" value={String(clubs.length)} hint="Global club directory" />
        <Metric label="School events" value={String(schoolEvents.length)} hint="Admin-owned schedule" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ClubEditor
          onCreated={() => {
            void loadUsers();
            void refreshClubs();
          }}
        />
        <section id="school-events" className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">School events</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Create and edit global events</h2>
            <p className="text-sm text-white/60">These remain admin-only and separate from club-scoped event tooling.</p>
          </div>
          <EventEditor
            event={editingSchoolEvent}
            allowedCategories={['school_wide', 'academic', 'meals']}
            title="School-wide event manager"
            description="Global events are created here; club events belong on club pages."
            onSave={async (payload) => {
              await saveEvent({ ...payload, scope: 'school', relatedGroupId: undefined, category: payload.category });
              setEditingSchoolEvent(null);
            }}
            onCancelEdit={() => setEditingSchoolEvent(null)}
          />
          <div className="space-y-2">
            {schoolEvents.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">No school-wide events yet.</p>
            ) : (
              schoolEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setEditingSchoolEvent(event)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-left transition hover:bg-white/10"
                >
                  <p className="font-medium text-white">{event.title}</p>
                  <p className="mt-1 text-xs text-white/60">{formatDateTimeRange(event.startTime, event.endTime)}</p>
                  <p className="mt-1 text-xs text-white/40">{event.location ?? 'Location pending'}</p>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Users</h2>
            <p className="text-sm text-white/60">Update roles to control privileged access.</p>
          </div>
          {roleStatus ? <p className="text-sm text-white/60">{roleStatus}</p> : null}
        </div>
        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-white/10 p-4 text-white/70">Loading users…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((user) => (
              <div key={user.id} className="rounded-3xl border border-white/5 bg-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{user.name || 'Unnamed user'}</p>
                    <p className="text-sm text-white/60">{user.email}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/60">
                    {user.clubsJoined.length} club{user.clubsJoined.length === 1 ? '' : 's'}
                  </span>
                </div>
                <select
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-accent"
                  value={user.role}
                  onChange={(event) => void changeRole(user.id, event.target.value as UserRole)}
                >
                  {['student', 'manager', 'master', 'admin'].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-xs text-white/45">
                  Cohort: {user.grade && user.section ? `${user.grade} · ${user.section}` : 'grade/section not set yet'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
          <h2 className="text-xl font-semibold text-white">Club operations handoff</h2>
          <p className="mt-2 text-sm text-white/60">Global admin actions live here. Club-scoped events, imports, attendance, and certificate issuance now live on each club page.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {clubs.map((club) => (
              <Link key={club.id} to={`/my-clubs/${club.id}`} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                <div className="font-medium">{club.name}</div>
                <div className="mt-1 text-xs text-white/50">{club.schedule}</div>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
          <h2 className="text-xl font-semibold text-white">Imports</h2>
          <p className="mt-2 text-sm text-white/60">Calendar imports remain club-scoped so imported activity lands in the correct workspace. Timetable and meal datasets now also have a reserved place in the model.</p>
          {datasets.length === 0 ? (
            <div className="mt-4">
              <EmptyStateCard
                eyebrow="Datasets"
                title="No timetable datasets published yet"
                body="The schedule dataset collections and UI placeholders now exist. Admin can start adding metadata and imports without changing route structure again."
              />
            </div>
          ) : (
            <p className="mt-4 text-xs text-white/45">{datasets.length} schedule dataset record{datasets.length === 1 ? '' : 's'} currently available.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-glass">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/50">{hint}</p>
    </div>
  );
}

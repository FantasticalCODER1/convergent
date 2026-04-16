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
import type { ProposedCalendarChangeRecord } from '../types/Review';
import {
  listChangeLogs,
  listInboundMessages,
  listParsedAnnouncements,
  listProposedCalendarChanges,
  reviewProposedCalendarChange
} from '../services/adminReviewService';

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
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [editingSchoolEvent, setEditingSchoolEvent] = useState<EventRecord | null>(null);
  const [inboundCount, setInboundCount] = useState(0);
  const [parsedCount, setParsedCount] = useState(0);
  const [changeLogCount, setChangeLogCount] = useState(0);
  const [proposals, setProposals] = useState<ProposedCalendarChangeRecord[]>([]);
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

  const loadReviewScaffolding = async () => {
    const [messages, announcements, pendingProposals, changeLogs] = await Promise.all([
      listInboundMessages(),
      listParsedAnnouncements(),
      listProposedCalendarChanges(),
      listChangeLogs()
    ]);
    setInboundCount(messages.length);
    setParsedCount(announcements.length);
    setProposals(pendingProposals);
    setChangeLogCount(changeLogs.length);
  };

  useEffect(() => {
    void loadUsers();
    void loadReviewScaffolding();
  }, []);

  const changeRole = async (id: string, role: UserRole) => {
    setRoleStatus('Updating role…');
    await updateUserRole(id, role);
    await loadUsers();
    setRoleStatus('Role updated.');
  };

  const pendingProposals = proposals.filter((proposal) => proposal.status === 'pending_review');

  const handleReviewDecision = async (proposalId: string, decision: 'approved' | 'rejected') => {
    setReviewStatus(decision === 'approved' ? 'Approving change…' : 'Rejecting change…');
    await reviewProposedCalendarChange(proposalId, decision);
    await Promise.all([loadReviewScaffolding(), refreshClubs()]);
    setReviewStatus(decision === 'approved' ? 'Change approved.' : 'Change rejected.');
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

      <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Inbox review</p>
            <h2 className="mt-2 text-xl font-semibold text-white">School email change proposals</h2>
            <p className="text-sm text-white/60">Admins can review and apply proposal records here. External inbox ingestion and parsing are still scaffolded and are not live in this repo.</p>
          </div>
          {reviewStatus ? <p className="text-sm text-white/60">{reviewStatus}</p> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Inbound" value={String(inboundCount)} hint="Stored source messages" />
          <Metric label="Parsed" value={String(parsedCount)} hint="Structured announcements" />
          <Metric label="Pending" value={String(pendingProposals.length)} hint="Awaiting admin review" />
          <Metric label="Logs" value={String(changeLogCount)} hint="Recorded review actions" />
        </div>
        {pendingProposals.length === 0 ? (
              <EmptyStateCard
                eyebrow="Review queue"
                title="No pending proposals yet"
                body="The approval UI is live, but there is still no inbound inbox integration in this repo. Proposal documents have to exist before anything can be reviewed or applied here."
              />
        ) : (
          <div className="grid gap-4">
            {pendingProposals.map((proposal) => (
              <div key={proposal.id} className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/45">{proposal.parsedType}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{proposal.subject}</h3>
                    <p className="mt-1 text-sm text-white/60">{proposal.sender}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/60">
                    Confidence {proposal.confidence?.toFixed(2) ?? 'n/a'}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Current values</p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-white/70">{JSON.stringify(proposal.oldValues, null, 2)}</pre>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Proposed values</p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-white/80">{JSON.stringify(proposal.proposedValues, null, 2)}</pre>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                  <span>Source message: {proposal.sourceMessageId}</span>
                  <span>Affected events: {proposal.affectedEventIds.length ? proposal.affectedEventIds.join(', ') : 'none attached'}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => void handleReviewDecision(proposal.id, 'approved')} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600">
                    Approve and apply
                  </button>
                  <button type="button" onClick={() => void handleReviewDecision(proposal.id, 'rejected')} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
            lockedScope="school"
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
          <p className="mt-2 text-sm text-white/60">Global admin actions live here. Club-scoped events, attendance, approvals, and certificate issuance now live on each club workspace.</p>
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
          <h2 className="text-xl font-semibold text-white">Calendar import operations</h2>
          <p className="mt-2 text-sm text-white/60">The supported import path is still script-driven. Dataset files live in the repo, the registry decides what is active, and `npm run calendar:import` is the apply path. This page only reports published dataset metadata.</p>
          {datasets.length === 0 ? (
            <div className="mt-4">
              <EmptyStateCard
                eyebrow="Datasets"
                title="No timetable datasets published yet"
                body="There is no in-app timetable or meal import console here. Publish dataset metadata or run the import script if you need live calendar ingestion."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-white/45">{datasets.length} schedule dataset record{datasets.length === 1 ? '' : 's'} currently available.</p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-xs text-white/65">
                <p>Registry path: <code>data/calendar/datasetsRegistry.json</code></p>
                <p className="mt-2">Docs: <code>docs/calendar-import.md</code></p>
                <p className="mt-2">Dry run: <code>npm run calendar:import -- --dry-run</code></p>
              </div>
            </div>
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

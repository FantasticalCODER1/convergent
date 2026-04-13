import { useMemo, useState } from 'react';
import { CalendarImporter } from '../admin/CalendarImporter';
import { CertificateUploader } from '../admin/CertificateUploader';
import { EventEditor } from '../admin/EventEditor';
import { formatDateTimeRange, formatRoleLabel, formatTimestamp } from '../../lib/formatters';
import type { CertificateRecord } from '../../types/Certificate';
import type { Club } from '../../types/Club';
import type { EventRecord } from '../../types/Event';
import type { AppUser } from '../../types/User';
import type { EventAttendanceRecord, EventInput } from '../../services/eventsService';

type Props = {
  club: Club;
  users: AppUser[];
  events: EventRecord[];
  certificates: CertificateRecord[];
  attendance: EventAttendanceRecord[];
  attendanceEventId: string | null;
  attendanceLoading: boolean;
  onSelectAttendanceEvent: (eventId: string) => void;
  onSaveEvent: (payload: EventInput) => Promise<unknown>;
  onRefresh: () => Promise<void> | void;
};

export function ClubManagementPanel({
  club,
  users,
  events,
  certificates,
  attendance,
  attendanceEventId,
  attendanceLoading,
  onSelectAttendanceEvent,
  onSaveEvent,
  onRefresh
}: Props) {
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    [events]
  );
  const selectedAttendanceEvent = sortedEvents.find((event) => event.id === attendanceEventId) ?? sortedEvents[0] ?? null;
  const recentCertificates = certificates.slice(0, 5);

  return (
    <aside className="space-y-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5 text-white shadow-glass xl:sticky xl:top-24">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Club operations</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Manage {club.name}</h2>
        <p className="mt-2 text-sm text-white/70">
          Club-scoped events, attendance, imports, and certificate issuance live here. Membership is currently open and self-serve, so there is no approval queue to process.
        </p>
      </div>

      <EventEditor
        clubId={club.id}
        event={editingEvent}
        allowedTypes={['club', 'competition']}
        title="Create or edit club events"
        description="Club pages are the primary workflow for scoped event management."
        onSave={async (payload) => {
          await onSaveEvent({ ...payload, clubId: club.id, type: payload.type === 'competition' ? 'competition' : 'club' });
          setEditingEvent(null);
          await onRefresh();
        }}
        onCancelEdit={() => setEditingEvent(null)}
      />

      <CertificateUploader clubId={club.id} clubName={club.name} users={users} onIssued={onRefresh} />

      <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Members</p>
            <p className="text-sm text-white/60">Current roster for club-scoped operations.</p>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60">{users.length} people</span>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-white/60">No member profiles available yet.</p>
        ) : (
          <div className="space-y-2">
            {users.slice(0, 8).map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/50">{user.email}</p>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                  {formatRoleLabel(user.role)}
                </span>
              </div>
            ))}
            {users.length > 8 ? <p className="text-xs text-white/50">Showing the first 8 members in the operations rail.</p> : null}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Attendance</p>
          <p className="text-sm text-white/60">Review RSVP lists for club events.</p>
        </div>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-white/60">Create a club event before attendance tracking becomes available.</p>
        ) : (
          <>
            <div className="grid gap-2">
              {sortedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    onSelectAttendanceEvent(event.id);
                    setEditingEvent(event);
                  }}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    selectedAttendanceEvent?.id === event.id ? 'border-emerald-300/40 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{event.title}</p>
                  <p className="text-xs text-white/60">{formatDateTimeRange(event.startTime, event.endTime)}</p>
                  <p className="text-xs text-white/40">{typeof event.rsvpCount === 'number' ? `${event.rsvpCount} RSVP${event.rsvpCount === 1 ? '' : 's'}` : 'Attendance list'}</p>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              {selectedAttendanceEvent ? (
                <>
                  <p className="text-sm font-medium text-white">{selectedAttendanceEvent.title}</p>
                  <p className="mt-1 text-xs text-white/50">{formatDateTimeRange(selectedAttendanceEvent.startTime, selectedAttendanceEvent.endTime)}</p>
                </>
              ) : null}
              {attendanceLoading ? (
                <p className="mt-3 text-sm text-white/60">Loading attendee list…</p>
              ) : attendance.length === 0 ? (
                <p className="mt-3 text-sm text-white/60">No confirmed attendees yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {attendance.map((entry) => (
                    <div key={entry.userId} className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{entry.name}</p>
                          <p className="text-xs text-white/50">{entry.email}</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                          {formatRoleLabel(entry.role)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/40">RSVP confirmed {formatTimestamp(entry.respondedAt, 'recently')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Certificate history</p>
            <p className="text-sm text-white/60">Recent club-issued records.</p>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60">{certificates.length} issued</span>
        </div>
        {recentCertificates.length === 0 ? (
          <p className="text-sm text-white/60">No certificates have been issued for this club yet.</p>
        ) : (
          <div className="space-y-2">
            {recentCertificates.map((certificate) => (
              <div key={certificate.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-sm font-medium text-white">{certificate.eventTitle}</p>
                <p className="mt-1 text-xs text-white/60">{certificate.userName}</p>
                <p className="mt-1 text-xs text-white/40">Issued {formatTimestamp(certificate.issuedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <CalendarImporter clubId={club.id} onImported={onRefresh} />
    </aside>
  );
}

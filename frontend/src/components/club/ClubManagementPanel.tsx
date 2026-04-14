import { useMemo, useState } from 'react';
import { CalendarImporter } from '../admin/CalendarImporter';
import { CertificateUploader } from '../admin/CertificateUploader';
import { ClubEditor } from '../admin/ClubEditor';
import { EventEditor } from '../admin/EventEditor';
import { ClubContentComposer } from './ClubContentComposer';
import { formatDateTimeRange, formatRoleLabel, formatTimestamp } from '../../lib/formatters';
import type { CertificateRecord } from '../../types/Certificate';
import type { Club } from '../../types/Club';
import type { EventRecord } from '../../types/Event';
import type { AppUser } from '../../types/User';
import type { EventAttendanceRecord, EventInput } from '../../services/eventsService';
import type { MembershipRequestRecord } from '../../services/clubsService';

type Props = {
  club: Club;
  users: AppUser[];
  events: EventRecord[];
  certificates: CertificateRecord[];
  attendance: EventAttendanceRecord[];
  attendanceEventId: string | null;
  attendanceLoading: boolean;
  membershipRequests: MembershipRequestRecord[];
  onSelectAttendanceEvent: (eventId: string) => void;
  onSaveEvent: (payload: EventInput) => Promise<unknown>;
  onCreateContent: (payload: {
    mode: 'post' | 'event' | 'post_event';
    title: string;
    content: string;
    category: EventRecord['category'];
    event?: {
      title: string;
      description?: string;
      category: EventRecord['category'];
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
      classroomLink?: string;
      classroomCourseId?: string;
      classroomPostLink?: string;
      meetLink?: string;
      resourceLinks: EventRecord['resourceLinks'];
      attendanceEnabled: boolean;
    };
  }) => Promise<void>;
  onReviewMembership: (userId: string, status: 'approved' | 'rejected') => Promise<void>;
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
  membershipRequests,
  onSelectAttendanceEvent,
  onSaveEvent,
  onCreateContent,
  onReviewMembership,
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
          Membership approvals, official posts, events, attendance, imports, and certificate issuance stay inside the club workspace.
        </p>
      </div>

      <ClubContentComposer defaultCategory={club.category} onSubmit={onCreateContent} />

      <ClubEditor
        club={club}
        onCreated={() => {
          void onRefresh();
        }}
      />

      {editingEvent ? (
        <EventEditor
          relatedGroupId={club.id}
          event={editingEvent}
          allowedCategories={['club', 'society', 'supw', 'sta', 'centre_of_excellence']}
          title="Edit selected event"
          description="Editing keeps the event record intact while posts and attendance remain linked."
          onSave={async (payload) => {
            await onSaveEvent({ ...payload, relatedGroupId: club.id, scope: 'group' });
            setEditingEvent(null);
            await onRefresh();
          }}
          onCancelEdit={() => setEditingEvent(null)}
        />
      ) : null}

      <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Approvals</p>
            <p className="text-sm text-white/60">Pending join requests for this club.</p>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60">{membershipRequests.length} pending</span>
        </div>
        {membershipRequests.length === 0 ? (
          <p className="text-sm text-white/60">No pending membership requests right now.</p>
        ) : (
          <div className="space-y-2">
            {membershipRequests.map((request) => (
              <div key={request.userId} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{request.user?.name ?? 'Pending member'}</p>
                    <p className="text-xs text-white/50">{request.user?.email ?? 'No email snapshot available'}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40">
                      {request.user?.grade && request.user?.section ? `${request.user.grade} · ${request.user.section}` : 'Profile incomplete'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                    {formatRoleLabel(request.user?.role)}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => void onReviewMembership(request.userId, 'approved')} className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600">
                    Approve
                  </button>
                  <button type="button" onClick={() => void onReviewMembership(request.userId, 'rejected')} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CertificateUploader clubId={club.id} clubName={club.name} users={users} onIssued={onRefresh} />

      <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Members</p>
            <p className="text-sm text-white/60">Current approved roster for club operations.</p>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60">{users.length} people</span>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-white/60">No approved member profiles available yet.</p>
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
            {users.length > 8 ? <p className="text-xs text-white/50">Showing the first 8 approved members in the operations rail.</p> : null}
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

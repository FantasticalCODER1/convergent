import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import { Link } from 'react-router-dom';
import { EventDetails } from '../components/EventDetails';
import { EventEditor } from '../components/admin/EventEditor';
import { EventCard } from '../components/EventCard';
import { useEvents } from '../hooks/useEvents';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { formatDateTimeRange } from '../lib/formatters';
import { canManageClub } from '../lib/policy';
import type { EventRecord } from '../types/Event';

export default function CalendarPage() {
  const { user } = useAuth();
  const { clubs } = useClubs();
  const { events, loading, toggleRsvp, rsvps, saveEvent } = useEvents();
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const schoolEvents = useMemo(() => events.filter((event) => !event.clubId), [events]);
  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.startTime).getTime() >= Date.now()).slice(0, 6),
    [events]
  );
  const managedClubs = useMemo(() => clubs.filter((club) => canManageClub(user, club)), [clubs, user]);
  const manageableClubIds = useMemo(() => new Set(managedClubs.map((club) => club.id)), [managedClubs]);

  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.allDay ? event.startTime.slice(0, 10) : event.startTime,
        end: event.allDay ? event.endTime.slice(0, 10) : event.endTime,
        allDay: event.allDay,
        extendedProps: event
      })),
    [events]
  );

  const handleEventClick = (info: EventClickArg) => {
    const eventData = info.event.extendedProps as EventRecord;
    setSelected(eventData);
  };

  const renderEventContent = (arg: EventContentArg) => (
    <div className="min-w-0 overflow-hidden px-1 py-0.5 text-[11px] leading-tight">
      {arg.timeText ? <div className="truncate font-medium text-white/80">{arg.timeText}</div> : null}
      <div className="truncate font-semibold text-white">{arg.event.title}</div>
    </div>
  );

  const canEditSelectedEvent = !!selected && (user?.role === 'admin' || (!!selected.clubId && manageableClubIds.has(selected.clubId)));
  const canEditEditingEvent = !!editingEvent && (user?.role === 'admin' || (!!editingEvent.clubId && manageableClubIds.has(editingEvent.clubId)));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Schedule</p>
        <h1 className="text-3xl font-semibold text-white">Calendar</h1>
        <p className="text-white/60">Open any event for details, RSVP actions, and club-aware editing where you have permission.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-glass">
          {loading ? (
            <div className="p-8 text-center text-white/70">Loading events…</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="78vh"
              events={calendarEvents}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              dayMaxEventRows={3}
              headerToolbar={{
                start: 'title',
                center: '',
                end: 'dayGridMonth,timeGridWeek,timeGridDay today prev,next'
              }}
              eventDisplay="block"
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Upcoming</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Next events</h2>
              </div>
              <span className="text-xs text-white/50">{upcomingEvents.length} scheduled</span>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No upcoming events yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelected(event)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="mt-1 text-xs text-white/60">{formatDateTimeRange(event.startTime, event.endTime)}</p>
                    <p className="mt-1 text-xs text-white/40">{event.location ?? (event.clubId ? 'Club event' : 'School-wide event')}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {managedClubs.length > 0 ? (
            <section className="rounded-3xl border border-emerald-300/20 bg-emerald-500/5 p-4 text-white shadow-glass">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-100">Managed clubs</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Create club events from the club page</h2>
              <div className="mt-4 space-y-2">
                {managedClubs.map((club) => (
                  <Link key={club.id} to={`/clubs/${club.id}`} className="block rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                    <div className="font-medium">{club.name}</div>
                    <div className="mt-1 text-xs text-white/50">{club.schedule}</div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {user?.role === 'admin' ? (
            <section className="rounded-3xl border border-indigo-300/20 bg-indigo-500/5 p-4 text-white shadow-glass">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-100">School-wide controls</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Global events stay in Admin</h2>
              <p className="mt-2 text-sm text-white/70">Use the admin panel for school-wide event creation and editing so club-scoped operations remain on club pages.</p>
              <Link to="/admin#school-events" className="mt-4 inline-flex rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600">
                Open school event controls
              </Link>
              {schoolEvents.length > 0 ? <p className="mt-3 text-xs text-white/50">{schoolEvents.length} school-wide event{schoolEvents.length === 1 ? '' : 's'} currently scheduled.</p> : null}
            </section>
          ) : null}
        </aside>
      </div>

      {editingEvent && canEditEditingEvent ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EventEditor
            event={editingEvent}
            allowedTypes={editingEvent.clubId ? ['club', 'competition'] : ['school']}
            clubId={editingEvent.clubId}
            title={editingEvent.clubId ? 'Edit club event' : 'Edit school-wide event'}
            description={editingEvent.clubId ? 'Club-scoped updates are saved here and on the matching club page.' : 'School-wide events remain admin-only.'}
            onSave={async (payload) => {
              await saveEvent({
                ...payload,
                type: editingEvent.clubId ? payload.type : 'school',
                clubId: editingEvent.clubId ?? undefined
              });
              setEditingEvent(null);
            }}
            onCancelEdit={() => setEditingEvent(null)}
          />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Editing</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{editingEvent.title}</h2>
            <p className="mt-2 text-sm text-white/70">{formatDateTimeRange(editingEvent.startTime, editingEvent.endTime)}</p>
            {editingEvent.clubId ? (
              <Link to={`/clubs/${editingEvent.clubId}`} className="mt-4 inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                Open club workspace
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
      <EventDetails
        event={selected}
        open={!!selected}
        attending={selected ? rsvps[selected.id] : false}
        onClose={() => setSelected(null)}
        onRsvp={(attending) => (selected ? toggleRsvp(selected.id, attending) : Promise.resolve())}
        canEdit={canEditSelectedEvent}
        onEdit={
          canEditSelectedEvent && selected
            ? () => {
                setEditingEvent(selected);
                setSelected(null);
              }
            : undefined
        }
      />
    </div>
  );
}

import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import { Link } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { EventDetails } from '../components/EventDetails';
import { EventEditor } from '../components/admin/EventEditor';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { useSchedules } from '../hooks/useSchedules';
import { canManageClub } from '../lib/policy';
import { formatDateTimeRange } from '../lib/formatters';
import type { EventRecord } from '../types/Event';

const categoryTint: Record<string, string> = {
  school_wide: '#38bdf8',
  academic: '#f59e0b',
  club: '#818cf8',
  society: '#22c55e',
  supw: '#f97316',
  sta: '#ec4899',
  centre_of_excellence: '#14b8a6',
  meals: '#facc15'
};

export default function CalendarPage() {
  const { user } = useAuth();
  const { clubs } = useClubs();
  const { events, loading, toggleRsvp, rsvps, saveEvent } = useEvents();
  const { entries: scheduleEntries } = useSchedules();
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);

  const managedClubs = useMemo(() => clubs.filter((club) => canManageClub(user, club)), [clubs, user]);
  const manageableClubIds = useMemo(() => new Set(managedClubs.map((club) => club.id)), [managedClubs]);
  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.startTime).getTime() >= Date.now()).slice(0, 6),
    [events]
  );
  const scheduleHighlights = useMemo(() => {
    return scheduleEntries
      .filter((entry) => {
        const gradeMatches = !entry.grade || entry.grade.toLowerCase() === String(user?.grade ?? '').trim().toLowerCase();
        const sectionMatches = !entry.section || entry.section.toLowerCase() === String(user?.section ?? '').trim().toLowerCase();
        return gradeMatches && sectionMatches;
      })
      .slice(0, 5);
  }, [scheduleEntries, user?.grade, user?.section]);

  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.allDay ? event.startTime.slice(0, 10) : event.startTime,
        end: event.allDay ? event.endTime.slice(0, 10) : event.endTime,
        allDay: event.allDay,
        backgroundColor: categoryTint[event.category] ?? '#818cf8',
        borderColor: categoryTint[event.category] ?? '#818cf8',
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

  const canEditSelectedEvent =
    !!selected && (user?.role === 'admin' || (!!selected.relatedGroupId && manageableClubIds.has(selected.relatedGroupId)));
  const canEditEditingEvent =
    !!editingEvent && (user?.role === 'admin' || (!!editingEvent.relatedGroupId && manageableClubIds.has(editingEvent.relatedGroupId)));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Operations</p>
        <h1 className="text-3xl font-semibold text-white">Calendar</h1>
        <p className="text-white/60">This is now the main operational page for school-wide timing, group events, and future timetable overlays.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-glass">
          {loading ? (
            <div className="p-8 text-center text-white/70">Loading events…</div>
          ) : events.length === 0 ? (
            <EmptyStateCard
              eyebrow="Calendar"
              title="No timed items yet"
              body="The event model now supports school-wide, academic, club, society, SUPW, STA, Centre of Excellence, and meal-linked records. Once live data arrives, this page can absorb it without another route rethink."
              tone="accent"
            />
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
                    <p className="mt-1 text-xs text-white/40">{event.location ?? 'Location pending'}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Academic overlays</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Timetable + meals foundation</h2>
            {scheduleHighlights.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No schedule entries are mapped to your profile yet. The data model is ready for timetable and meals.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {scheduleHighlights.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm">
                    <div className="font-medium text-white">{entry.title}</div>
                    <div className="mt-1 text-white/55">{entry.blockName} · {entry.startTime} - {entry.endTime}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {managedClubs.length > 0 ? (
            <section className="rounded-3xl border border-emerald-300/20 bg-emerald-500/5 p-4 text-white shadow-glass">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-100">Managed groups</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Open a group workspace</h2>
              <div className="mt-4 space-y-2">
                {managedClubs.map((club) => (
                  <Link key={club.id} to={`/my-clubs/${club.id}`} className="block rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                    <div className="font-medium">{club.name}</div>
                    <div className="mt-1 text-xs text-white/50">{club.schedule}</div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Placeholders</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Linked resources stay explicit</h2>
            <p className="mt-2 text-sm text-white/70">Events now support Classroom links, Meet links, source metadata, and addable resource links even when live integrations are not ready yet.</p>
          </section>

          {user?.role === 'admin' ? (
            <section className="rounded-3xl border border-indigo-300/20 bg-indigo-500/5 p-4 text-white shadow-glass">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-100">Admin</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Global controls</h2>
              <p className="mt-2 text-sm text-white/70">School-wide event creation remains in the admin surface so route ownership stays clear.</p>
              <Link to="/admin#school-events" className="mt-4 inline-flex rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600">
                Open admin controls
              </Link>
            </section>
          ) : null}
        </aside>
      </div>

      {editingEvent && canEditEditingEvent ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EventEditor
            event={editingEvent}
            allowedCategories={editingEvent.relatedGroupId ? ['club', 'society', 'supw', 'sta', 'centre_of_excellence'] : ['school_wide', 'academic', 'meals']}
            relatedGroupId={editingEvent.relatedGroupId}
            title={editingEvent.relatedGroupId ? 'Edit group event' : 'Edit school-wide event'}
            description={editingEvent.relatedGroupId ? 'Group-scoped event updates stay attached to the relevant workspace.' : 'School-wide operational timing remains admin-owned.'}
            onSave={async (payload) => {
              await saveEvent({
                ...payload,
                scope: editingEvent.relatedGroupId ? 'group' : payload.scope,
                relatedGroupId: editingEvent.relatedGroupId ?? undefined
              });
              setEditingEvent(null);
            }}
            onCancelEdit={() => setEditingEvent(null)}
          />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Editing</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{editingEvent.title}</h2>
            <p className="mt-2 text-sm text-white/70">{formatDateTimeRange(editingEvent.startTime, editingEvent.endTime)}</p>
            {editingEvent.relatedGroupId ? (
              <Link to={`/my-clubs/${editingEvent.relatedGroupId}`} className="mt-4 inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                Open group workspace
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

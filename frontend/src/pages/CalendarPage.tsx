import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import { EventDetails } from '../components/EventDetails';
import { EventEditor } from '../components/admin/EventEditor';
import { useEvents } from '../hooks/useEvents';
import { useAuth } from '../hooks/useAuth';
import type { EventRecord } from '../types/Event';

export default function CalendarPage() {
  const { user } = useAuth();
  const { events, loading, toggleRsvp, rsvps, saveEvent } = useEvents();
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [editingGlobalEvent, setEditingGlobalEvent] = useState<EventRecord | null>(null);
  const schoolEvents = useMemo(() => events.filter((event) => !event.clubId), [events]);

  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        extendedProps: event
      })),
    [events]
  );

  const handleEventClick = (info: EventClickArg) => {
    const eventData = info.event.extendedProps as EventRecord;
    setSelected(eventData);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Schedule</p>
        <h1 className="text-3xl font-semibold text-white">Calendar</h1>
        <p className="text-white/60">Click any event to RSVP, view details, or add it to Google Calendar.</p>
      </div>
      <div className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-glass">
        {loading ? (
          <div className="p-8 text-center text-white/70">Loading events…</div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="80vh"
            events={calendarEvents}
            eventClick={handleEventClick}
            headerToolbar={{
              start: 'title',
              center: '',
              end: 'dayGridMonth,timeGridWeek,timeGridDay today prev,next'
            }}
            eventDisplay="block"
          />
        )}
      </div>
      {user?.role === 'admin' ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <EventEditor
            event={editingGlobalEvent}
            allowedTypes={['school']}
            title="Manage school-wide events"
            description="These events stay global and remain admin-only."
            onSave={async (payload) => {
              await saveEvent({ ...payload, type: 'school', clubId: undefined });
              setEditingGlobalEvent(null);
            }}
            onCancelEdit={() => setEditingGlobalEvent(null)}
          />
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">School-wide events</p>
              <p className="text-sm text-white/60">Pick an existing global event to edit it.</p>
            </div>
            {schoolEvents.length === 0 ? (
              <p className="text-sm text-white/60">No school-wide events yet.</p>
            ) : (
              schoolEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setEditingGlobalEvent(event)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                >
                  <p className="font-medium text-white">{event.title}</p>
                  <p className="text-xs text-white/60">{new Date(event.startTime).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
        </section>
      ) : null}
      <EventDetails
        event={selected}
        open={!!selected}
        attending={selected ? rsvps[selected.id] : false}
        onClose={() => setSelected(null)}
        onRsvp={(attending) => (selected ? toggleRsvp(selected.id, attending) : Promise.resolve())}
      />
    </div>
  );
}

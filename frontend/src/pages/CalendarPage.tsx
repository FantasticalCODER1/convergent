import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import { EventDetails } from '../components/EventDetails';
import { useEvents } from '../hooks/useEvents';
import type { EventRecord } from '../types/Event';

export default function CalendarPage() {
  const { events, loading, toggleRsvp, rsvps } = useEvents();
  const [selected, setSelected] = useState<EventRecord | null>(null);

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

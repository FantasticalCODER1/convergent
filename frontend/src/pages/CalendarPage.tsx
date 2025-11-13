import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { data } from '../data';
import { addToGoogleCalendar, downloadIcs } from '../services/Calendar';
import type { EventDoc } from '../data/DataProvider';

type EventPayload = {
  id: string;
  title: string;
  start?: string;
  end?: string;
  extendedProps: Record<string, any>;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<EventPayload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await data.listEvents();
        if (cancelled) return;
        setEvents(
          stored.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            extendedProps: event
          }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEventClick = async (info: EventClickArg) => {
    const eventData = info.event.extendedProps as EventDoc;
    const startIso = eventData.start ?? info.event.start?.toISOString() ?? new Date().toISOString();
    const endIso = eventData.end ?? info.event.end?.toISOString() ?? startIso;
    const payload = {
      title: eventData.title ?? info.event.title,
      description: eventData.description ?? '',
      location: eventData.location ?? '',
      start: startIso,
      end: endIso
    };
    try {
      await addToGoogleCalendar(payload);
      alert('Event added to Google Calendar.');
    } catch (err) {
      console.error(err);
      downloadIcs(payload);
      alert('Google Calendar insert failed. Downloaded ICS instead.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Schedule</p>
        <h1 className="text-3xl font-semibold text-white">Calendar</h1>
        <p className="text-white/60">Click any event to RSVP via Google Calendar or download an ICS.</p>
      </div>
      <div className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-glass">
        {loading ? (
          <div className="p-8 text-center text-white/70">Loading events…</div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="80vh"
            events={events}
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
    </div>
  );
}

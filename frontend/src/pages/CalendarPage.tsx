import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { addToGoogleCalendar } from '../services/CalendarService';
import { useAuth } from '../context/AuthContext';

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
  const { accessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'events'));
        if (cancelled) return;
        setEvents(
          snap.docs.map((docSnap) => {
            const data = docSnap.data() as Record<string, any>;
            return {
              id: docSnap.id,
              title: data.title ?? 'Untitled event',
              start: toIso(data.start),
              end: toIso(data.end),
              extendedProps: data
            } satisfies EventPayload;
          })
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
    const data = info.event.extendedProps as Record<string, any>;
    try {
      const startIso = toIso(data.start) ?? info.event.start?.toISOString() ?? new Date().toISOString();
      const endIso = toIso(data.end) ?? info.event.end?.toISOString() ?? startIso;
      await addToGoogleCalendar(accessToken, {
        title: data.title ?? info.event.title,
        description: data.description ?? '',
        location: data.location ?? '',
        start: startIso,
        end: endIso
      });
      alert('Event added to Google Calendar or downloaded as ICS.');
    } catch (err) {
      console.error(err);
      alert('Unable to add event. Please try again.');
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

function toIso(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

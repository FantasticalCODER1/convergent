import { getGoogleAccessAndProfile } from '../auth/google';

type CalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
};

export async function addToGoogleCalendar(e: CalendarEventInput) {
  try {
    const post = (token: string | undefined) =>
      fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          summary: e.title,
          description: e.description,
          location: e.location,
          start: { dateTime: e.start },
          end: { dateTime: e.end }
        })
      });

    let { accessToken } = await getGoogleAccessAndProfile();
    let res = await post(accessToken);
    if (res.status === 401) {
      ({ accessToken } = await getGoogleAccessAndProfile());
      res = await post(accessToken);
    }
    if (!res.ok) throw new Error(`Calendar insert failed: ${res.status}`);
    return res.json();
  } catch {
    // caller can fall back to ICS as you already do
    throw new Error('Calendar insert failed');
  }
}

export function downloadIcs(event: CalendarEventInput) {
  const toIcs = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
      d.getUTCMinutes()
    )}00Z`;
  };

  const escape = (value?: string) => (value ?? '').replace(/[\n,;]/g, ' ');

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:convergent
BEGIN:VEVENT
SUMMARY:${escape(event.title)}
DESCRIPTION:${escape(event.description)}
LOCATION:${escape(event.location)}
DTSTART:${toIcs(event.start)}
DTEND:${toIcs(event.end)}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'event.ics';
  a.click();
  URL.revokeObjectURL(url);
  return { fallback: true };
}

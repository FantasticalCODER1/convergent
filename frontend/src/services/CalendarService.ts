type EventInput = {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
};

export async function addToGoogleCalendar(accessToken: string | undefined, input: EventInput) {
  if (!accessToken) {
    createIcsDownload(input);
    return { created: false, fallback: true };
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description,
      location: input.location,
      start: { dateTime: input.start },
      end: { dateTime: input.end }
    })
  });

  if (!res.ok) {
    throw new Error('Calendar insert failed');
  }

  return { created: true, event: await res.json() };
}

function createIcsDownload(input: EventInput) {
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:convergent\nBEGIN:VEVENT\nSUMMARY:${escapeIcs(
    input.title
  )}\nDESCRIPTION:${escapeIcs(input.description || '')}\nLOCATION:${escapeIcs(input.location || '')}\nDTSTART:${toIcsDate(
    input.start
  )}\nDTEND:${toIcsDate(input.end)}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'event.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toIcsDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes()
  )}00Z`;
}

function escapeIcs(value: string) {
  return value.replace(/[\n,;]/g, ' ');
}

import { useEffect, useState } from 'react';
import { addToGoogleCalendar, canInsertIntoGoogleCalendar, downloadIcs } from '../services/Calendar';
import { getCategoryMeta } from '../domain/categories';
import { formatDateLabel, formatTimeLabel, formatTimestamp } from '../lib/formatters';
import type { EventRecord } from '../types/Event';

type Props = {
  event: EventRecord | null;
  open: boolean;
  attending?: boolean;
  onClose: () => void;
  onRsvp?: (attending: boolean) => Promise<void> | void;
  canEdit?: boolean;
  onEdit?: () => void;
};

export function EventDetails({ event, open, attending, onClose, onRsvp, canEdit, onEdit }: Props) {
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);

  useEffect(() => {
    setCalendarMessage(null);
    setRsvpBusy(false);
  }, [event?.id, open]);

  if (!open || !event) return null;

  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;
  const canUseGoogleCalendar = canInsertIntoGoogleCalendar();
  const category = getCategoryMeta(event.category);

  const handleCalendar = async () => {
    if (!event.startTime) return;
    const payload = {
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      start: event.startTime,
      end: event.endTime ?? event.startTime,
      allDay: event.allDay
    };
    if (!canUseGoogleCalendar) {
      downloadIcs(payload);
      setCalendarMessage('Downloaded an .ics file for this environment.');
      return;
    }
    try {
      await addToGoogleCalendar(payload);
      setCalendarMessage('Added to Google Calendar.');
    } catch {
      downloadIcs(payload);
      setCalendarMessage('Google Calendar was unavailable, so an .ics file was downloaded instead.');
    }
  };

  const handleRsvp = async (value: boolean) => {
    if (!onRsvp) return;
    setRsvpBusy(true);
    try {
      await onRsvp(value);
    } finally {
      setRsvpBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 text-white">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-900/90 p-6 shadow-glass">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{category.label}</p>
            <h3 className="text-2xl font-semibold">{event.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 transition hover:text-white">
            Close
          </button>
        </div>
        {event.description && <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-white/80">{event.description}</p>}
        <dl className="mt-4 grid gap-4 text-sm text-white/70 sm:grid-cols-2">
          {start && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="uppercase text-[10px] tracking-[0.3em] text-white/40">Starts</dt>
              <dd className="mt-2 text-base text-white">{formatDateLabel(start)}</dd>
              <dd className="text-white/60">{event.allDay ? 'All day' : formatTimeLabel(start)}</dd>
            </div>
          )}
          {end && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="uppercase text-[10px] tracking-[0.3em] text-white/40">Ends</dt>
              <dd className="mt-2 text-base text-white">{formatDateLabel(end)}</dd>
              <dd className="text-white/60">{event.allDay ? 'All day' : formatTimeLabel(end)}</dd>
            </div>
          )}
          {event.location && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="uppercase text-[10px] tracking-[0.3em] text-white/40">Location</dt>
              <dd className="mt-2 text-base text-white">{event.location}</dd>
            </div>
          )}
          {typeof event.rsvpCount === 'number' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="uppercase text-[10px] tracking-[0.3em] text-white/40">Attendance</dt>
              <dd className="mt-2 text-base text-white">{event.rsvpCount} RSVP{event.rsvpCount === 1 ? '' : 's'}</dd>
              {event.updatedAt ? <dd className="text-white/50">Updated {formatTimestamp(event.updatedAt)}</dd> : null}
            </div>
          )}
        </dl>
        {event.classroomLink || event.classroomPostLink || event.meetLink || event.resourceLinks.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {event.classroomLink ? (
              <a href={event.classroomLink} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10">
                Open Classroom
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-white/45">Classroom link not attached</div>
            )}
            {event.classroomPostLink ? (
              <a href={event.classroomPostLink} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10">
                Open Classroom Post
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-white/45">Classroom post not attached</div>
            )}
            {event.meetLink ? (
              <a href={event.meetLink} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10">
                Open Meet
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-white/45">Meet link not attached</div>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              {event.resourceLinks.length > 0 ? `${event.resourceLinks.length} resource link${event.resourceLinks.length === 1 ? '' : 's'} attached` : 'Resource links not attached'}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-white/45">
            Classroom, Meet, and resource links can be added later without rewriting the event structure.
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCalendar}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            {canUseGoogleCalendar ? 'Add to Google Calendar' : 'Download .ics'}
          </button>
          {onRsvp && (
            <button
              type="button"
              disabled={rsvpBusy}
              onClick={() => void handleRsvp(!attending)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                attending ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {rsvpBusy ? 'Saving…' : attending ? 'Cancel RSVP' : 'RSVP'}
            </button>
          )}
          {canEdit && onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
            >
              Edit event
            </button>
          ) : null}
        </div>
        {calendarMessage ? <p className="mt-4 text-sm text-white/60">{calendarMessage}</p> : null}
      </div>
    </div>
  );
}

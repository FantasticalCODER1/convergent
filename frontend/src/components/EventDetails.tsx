import { addToGoogleCalendar, downloadIcs } from '../services/Calendar';
import type { EventRecord } from '../types/Event';

type Props = {
  event: EventRecord | null;
  open: boolean;
  attending?: boolean;
  onClose: () => void;
  onRsvp?: (attending: boolean) => Promise<void> | void;
};

export function EventDetails({ event, open, attending, onClose, onRsvp }: Props) {
  if (!open || !event) return null;

  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;

  const handleCalendar = async () => {
    if (!event.startTime) return;
    const payload = {
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      start: event.startTime,
      end: event.endTime ?? event.startTime
    };
    try {
      await addToGoogleCalendar(payload);
      alert('Added to Google Calendar');
    } catch {
      downloadIcs(payload);
      alert('Calendar insert failed. Downloaded ICS instead.');
    }
  };

  const handleRsvp = (value: boolean) => {
    if (!onRsvp) return;
    void onRsvp(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 text-white">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-900/90 p-6 shadow-glass">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{event.type}</p>
            <h3 className="text-2xl font-semibold">{event.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 transition hover:text-white">
            Close
          </button>
        </div>
        {event.description && <p className="mt-4 text-white/80">{event.description}</p>}
        <dl className="mt-4 space-y-1 text-sm text-white/70">
          {start && (
            <div>
              <dt className="uppercase text-[10px] tracking-[0.3em] text-white/40">Starts</dt>
              <dd>{start.toLocaleString()}</dd>
            </div>
          )}
          {end && (
            <div>
              <dt className="uppercase text-[10px] tracking-[0.3em] text-white/40">Ends</dt>
              <dd>{end.toLocaleString()}</dd>
            </div>
          )}
          {event.location && (
            <div>
              <dt className="uppercase text-[10px] tracking-[0.3em] text-white/40">Location</dt>
              <dd>{event.location}</dd>
            </div>
          )}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCalendar}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Add to Calendar
          </button>
          {onRsvp && (
            <button
              type="button"
              onClick={() => handleRsvp(!attending)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                attending ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {attending ? 'Cancel RSVP' : 'RSVP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

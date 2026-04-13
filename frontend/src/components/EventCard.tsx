import { CalendarDays, MapPin, UsersRound } from 'lucide-react';
import { formatDateTimeRange } from '../lib/formatters';
import type { EventRecord } from '../types/Event';

type Props = {
  event: EventRecord;
  attending?: boolean;
  onRsvp?: (eventId: string, attending: boolean) => Promise<void> | void;
  onOpen?: (event: EventRecord) => void;
};

export function EventCard({ event, attending, onRsvp, onOpen }: Props) {
  const handleRsvp = () => {
    if (!onRsvp) return;
    onRsvp(event.id, !attending);
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-white shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{event.type ?? 'event'}</p>
          <h3 className="text-xl font-semibold">{event.title}</h3>
        </div>
        {typeof event.rsvpCount === 'number' && (
          <div className="flex items-center gap-1 text-sm text-white/70">
            <UsersRound className="size-4" />
            {event.rsvpCount}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4" /> {formatDateTimeRange(event.startTime, event.endTime)}
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4" /> {event.location}
          </div>
        )}
        {event.description ? <p className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 text-xs leading-6 text-white/60">{event.description}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(event)}
            className="rounded-2xl border border-white/20 px-3 py-1 text-sm text-white/80 transition hover:bg-white/10"
          >
            Details
          </button>
        )}
        {onRsvp && (
          <button
            type="button"
            onClick={handleRsvp}
            className={`rounded-2xl px-4 py-1 text-sm font-medium transition ${
              attending ? 'bg-emerald-500/90 text-white hover:bg-emerald-500' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {attending ? 'RSVP’d' : 'RSVP'}
          </button>
        )}
      </div>
    </div>
  );
}

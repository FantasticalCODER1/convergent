import { CalendarDays, MapPin, UsersRound } from 'lucide-react';
import type { EventRecord } from '../types/Event';

type Props = {
  event: EventRecord;
  attending?: boolean;
  onRsvp?: (eventId: string, attending: boolean) => Promise<void> | void;
  onOpen?: (event: EventRecord) => void;
};

function formatRange(start?: string, end?: string) {
  if (!start) return 'TBD';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const dateDisplay = startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (!endDate) return `${dateDisplay} • ${startTime}`;
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const endTime = endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `${dateDisplay} • ${startTime} – ${endTime}` : `${dateDisplay} • ${startTime} → ${endDate.toLocaleDateString()} ${endTime}`;
}

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
          <CalendarDays className="size-4" /> {formatRange(event.startTime, event.endTime)}
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4" /> {event.location}
          </div>
        )}
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

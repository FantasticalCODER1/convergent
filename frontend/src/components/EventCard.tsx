import { CalendarDays, MapPin, UsersRound } from 'lucide-react';
import { getCategoryMeta } from '../domain/categories';
import { formatDateTimeRange } from '../lib/formatters';
import type { EventRecord } from '../types/Event';
import { QuietBadge } from './ui/product';

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
  const category = getCategoryMeta(event.category);

  return (
    <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,25,43,0.88),rgba(12,18,33,0.88))] p-4 text-[var(--text-strong)] shadow-[0_20px_50px_rgba(3,8,22,0.2)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">{category.shortLabel}</p>
          <h3 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em]">{event.title}</h3>
        </div>
        {typeof event.rsvpCount === 'number' && (
          <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
            <UsersRound className="size-4" />
            {event.rsvpCount}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4" /> {formatDateTimeRange(event.startTime, event.endTime)}
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4" /> {event.location}
          </div>
        )}
        {event.classroomLink || event.classroomPostLink || event.meetLink || event.resourceLinks.length > 0 ? (
          <div className="pt-1">
            <QuietBadge>{event.classroomLink
              ? 'Classroom linked'
              : event.classroomPostLink
                ? 'Classroom post linked'
                : event.meetLink
                  ? 'Meet linked'
                  : `${event.resourceLinks.length} resource link${event.resourceLinks.length === 1 ? '' : 's'}`}</QuietBadge>
          </div>
        ) : null}
        {event.description ? <p className="rounded-[18px] border border-white/8 bg-[rgba(8,12,23,0.24)] px-3 py-3 text-sm leading-6 text-[var(--text-muted)]">{event.description}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(event)}
            className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--text-strong)] transition hover:bg-white/8"
          >
            Details
          </button>
        )}
        {onRsvp && (
          <button
            type="button"
            onClick={handleRsvp}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${
              attending ? 'bg-emerald-400/90 text-slate-950 hover:bg-emerald-300' : 'border border-white/10 bg-[rgba(8,12,23,0.24)] text-[var(--text-strong)] hover:bg-white/8'
            }`}
          >
            {attending ? 'RSVP’d' : 'RSVP'}
          </button>
        )}
      </div>
    </div>
  );
}

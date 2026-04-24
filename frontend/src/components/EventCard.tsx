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
    <div className="rounded-[12px] border border-[color:var(--line)] bg-[color:var(--panel)] p-4 text-[var(--text-strong)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--text-faint)]">{category.shortLabel}</p>
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
            <QuietBadge>
              {event.classroomLink
                ? 'Classroom linked'
                : event.classroomPostLink
                  ? 'Classroom post linked'
                  : event.meetLink
                    ? 'Meet linked'
                    : `${event.resourceLinks.length} resource link${event.resourceLinks.length === 1 ? '' : 's'}`}
            </QuietBadge>
          </div>
        ) : null}
        {event.description ? (
          <p className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-3 py-3 text-sm leading-6 text-[var(--text-muted)]">
            {event.description}
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(event)}
            className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
          >
            Details
          </button>
        )}
        {onRsvp && (
          <button
            type="button"
            onClick={handleRsvp}
            className={`inline-flex items-center rounded-[10px] px-4 py-2 text-sm font-medium transition ${
              attending
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'border border-[color:var(--line)] bg-[color:var(--panel-2)] text-[var(--text-strong)] hover:bg-white'
            }`}
          >
            {attending ? 'RSVP’d' : 'RSVP'}
          </button>
        )}
      </div>
    </div>
  );
}

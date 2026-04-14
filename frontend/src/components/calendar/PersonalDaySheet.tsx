import { format } from 'date-fns';
import { ExternalLink, Layers3, MapPin, Utensils, X } from 'lucide-react';
import { getCategoryMeta } from '../../domain/categories';
import { formatDateTimeRange, formatRoleLabel, formatTimeLabel } from '../../lib/formatters';
import type { PersonalCalendarItem } from '../../types/PersonalCalendar';

type PositionedItem = {
  item: PersonalCalendarItem;
  top: number;
  height: number;
  column: number;
  columnCount: number;
};

type Props = {
  date: Date | null;
  focusedItemId?: string | null;
  items: PersonalCalendarItem[];
  onClose: () => void;
  open: boolean;
  onEditFocusedItem?: () => void;
};

const categoryTint: Record<string, string> = {
  school_wide: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
  academic: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  club: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100',
  society: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  supw: 'border-orange-400/30 bg-orange-500/10 text-orange-100',
  sta: 'border-pink-400/30 bg-pink-500/10 text-pink-100',
  centre_of_excellence: 'border-teal-400/30 bg-teal-500/10 text-teal-100',
  meals: 'border-yellow-300/30 bg-yellow-400/10 text-yellow-50'
};

function buildTimedLayout(items: PersonalCalendarItem[]) {
  const hourHeight = 72;
  const timedItems = items.filter((item) => !item.allDay);
  if (timedItems.length === 0) {
    return { positioned: [] as PositionedItem[], startHour: 7, endHour: 20, hourHeight };
  }

  const startHour = Math.max(
    6,
    Math.min(...timedItems.map((item) => new Date(item.startTime).getHours()))
  );
  const endHour = Math.min(
    23,
    Math.max(...timedItems.map((item) => {
      const end = new Date(item.endTime);
      return end.getMinutes() > 0 ? end.getHours() + 1 : end.getHours();
    })) + 1
  );

  const sorted = [...timedItems].sort((left, right) => {
    const startCompare = new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
    if (startCompare !== 0) return startCompare;
    return new Date(left.endTime).getTime() - new Date(right.endTime).getTime();
  });

  let clusterId = -1;
  let clusterEnd = -1;
  const active: Array<{ end: number; column: number; clusterId: number }> = [];
  const clusterWidths = new Map<number, number>();
  const placed = sorted.map((item) => {
    const start = new Date(item.startTime).getTime();
    const end = new Date(item.endTime).getTime();
    if (start >= clusterEnd) {
      clusterId += 1;
      clusterEnd = end;
      active.length = 0;
    } else {
      clusterEnd = Math.max(clusterEnd, end);
    }

    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].end <= start) {
        active.splice(index, 1);
      }
    }

    let column = 0;
    while (active.some((entry) => entry.column === column)) {
      column += 1;
    }
    active.push({ end, column, clusterId });
    clusterWidths.set(clusterId, Math.max(clusterWidths.get(clusterId) ?? 1, active.length, column + 1));

    return { item, clusterId, column };
  });

  return {
    startHour,
    endHour,
    hourHeight,
    positioned: placed.map(({ item, clusterId, column }) => {
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);
      const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
      const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60000);
      return {
        item,
        top: (startMinutes / 60) * hourHeight,
        height: (durationMinutes / 60) * hourHeight,
        column,
        columnCount: clusterWidths.get(clusterId) ?? 1
      };
    })
  };
}

export function PersonalDaySheet({ date, focusedItemId, items, onClose, open, onEditFocusedItem }: Props) {
  if (!open || !date) return null;

  const allDayItems = items.filter((item) => item.allDay);
  const timeline = buildTimedLayout(items);
  const totalHeight = (timeline.endHour - timeline.startHour + 1) * timeline.hourHeight;
  const focusedItem = items.find((item) => item.id === focusedItemId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 text-white backdrop-blur-sm">
      <div className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-slate-950/95 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Day View</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{format(date, 'EEEE, d MMMM')}</h2>
            <p className="mt-2 text-sm text-white/60">
              {items.length === 0 ? 'No personal items for this day.' : `${items.length} personal item${items.length === 1 ? '' : 's'} mapped into your calendar.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {focusedItem && onEditFocusedItem ? (
              <button
                type="button"
                onClick={onEditFocusedItem}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Edit event
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close day view"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-y-auto px-6 py-6">
            {allDayItems.length > 0 ? (
              <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">All day</p>
                <div className="mt-4 grid gap-3">
                  {allDayItems.map((item) => {
                    const category = getCategoryMeta(item.category);
                    return (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.25em] ${categoryTint[item.category] ?? categoryTint.school_wide}`}>
                            {category.shortLabel}
                          </span>
                          {item.relatedGroup ? (
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/60">
                              {item.relatedGroup.name}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-lg font-semibold text-white">{item.title}</p>
                        {item.description ? <p className="mt-2 text-sm text-white/70">{item.description}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {items.filter((item) => !item.allDay).length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/60">
                No timed items are mapped for this day yet.
              </div>
            ) : (
              <div className="relative rounded-[32px] border border-white/10 bg-white/5">
                <div className="relative pl-16 pr-4" style={{ height: totalHeight }}>
                  {Array.from({ length: timeline.endHour - timeline.startHour + 1 }).map((_, index) => {
                    const hour = timeline.startHour + index;
                    return (
                      <div
                        key={hour}
                        className="absolute inset-x-0 border-t border-white/10"
                        style={{ top: index * timeline.hourHeight }}
                      >
                        <span className="absolute -left-12 -top-3 text-xs uppercase tracking-[0.2em] text-white/35">
                          {format(new Date(2024, 0, 1, hour), 'ha')}
                        </span>
                      </div>
                    );
                  })}

                  {timeline.positioned.map((entry) => {
                    const category = getCategoryMeta(entry.item.category);
                    const left = `calc(${(entry.column / entry.columnCount) * 100}% + ${entry.column * 4}px)`;
                    const width = `calc(${100 / entry.columnCount}% - ${(entry.columnCount - 1) * 4}px)`;
                    const focused = entry.item.id === focusedItemId;
                    return (
                      <div
                        key={entry.item.id}
                        className={`absolute rounded-3xl border px-4 py-3 shadow-lg ${categoryTint[entry.item.category] ?? categoryTint.school_wide} ${
                          focused ? 'ring-2 ring-white/60' : ''
                        }`}
                        style={{ top: entry.top, height: entry.height, left, width }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs uppercase tracking-[0.25em] text-white/60">{category.shortLabel}</p>
                            <p className="truncate text-sm font-semibold text-white">{entry.item.title}</p>
                            <p className="truncate text-xs text-white/70">
                              {formatTimeLabel(entry.item.startTime)} - {formatTimeLabel(entry.item.endTime)}
                            </p>
                          </div>
                          {entry.item.source === 'meal_schedule' ? <Utensils className="mt-0.5 size-4 shrink-0 text-white/70" /> : null}
                        </div>
                        {entry.item.metadata?.blockName ? <p className="mt-2 truncate text-xs text-white/70">{entry.item.metadata.blockName}</p> : null}
                        {entry.item.location ? <p className="mt-1 truncate text-xs text-white/65">{entry.item.location}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="overflow-y-auto border-t border-white/10 bg-slate-950/60 px-6 py-6 lg:border-l lg:border-t-0">
            {focusedItem ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Focused item</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{focusedItem.title}</h3>
                <p className="mt-2 text-sm text-white/60">{formatDateTimeRange(focusedItem.startTime, focusedItem.endTime)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.25em] ${categoryTint[focusedItem.category] ?? categoryTint.school_wide}`}>
                    {getCategoryMeta(focusedItem.category).label}
                  </span>
                  {focusedItem.relatedGroup ? (
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/60">
                      {focusedItem.relatedGroup.name}
                    </span>
                  ) : null}
                </div>
                {focusedItem.description ? <p className="mt-4 text-sm leading-7 text-white/75">{focusedItem.description}</p> : null}
                <div className="mt-4 space-y-3 text-sm text-white/70">
                  {focusedItem.location ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-white/45" />
                      <span>{focusedItem.location}</span>
                    </div>
                  ) : null}
                  {focusedItem.metadata?.teacher ? (
                    <div className="flex items-start gap-2">
                      <Layers3 className="mt-0.5 size-4 shrink-0 text-white/45" />
                      <span>{focusedItem.metadata.teacher}</span>
                    </div>
                  ) : null}
                  {focusedItem.author?.name ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">Posted by</p>
                      <p className="mt-2 font-medium text-white">{focusedItem.author.name}</p>
                      {focusedItem.author.email ? <p className="text-xs text-white/55">{focusedItem.author.email}</p> : null}
                      {focusedItem.author.role ? <p className="mt-1 text-xs text-white/45">{formatRoleLabel(focusedItem.author.role)}</p> : null}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 space-y-2">
                  {focusedItem.classroomLink ? (
                    <a
                      href={focusedItem.classroomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Open Classroom
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {focusedItem.classroomPostLink ? (
                    <a
                      href={focusedItem.classroomPostLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Open Classroom Post
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {focusedItem.meetLink ? (
                    <a
                      href={focusedItem.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Open Meet
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {focusedItem.resourceLinks.map((link) => (
                    <a
                      key={`${focusedItem.id}:${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      {link.label}
                      <ExternalLink className="size-4" />
                    </a>
                  ))}
                </div>
                {focusedItem.hiddenPrivateLinks ? (
                  <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white/50">
                    Private links are hidden until your membership is approved.
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/60">
                Select an item in the day to inspect links, author metadata, and timing detail.
              </section>
            )}

            <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Day list</p>
              <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-white/60">Nothing mapped for this day yet.</p>
                ) : (
                  items.map((item) => (
                    <div
                      key={`${item.id}:summary`}
                      className={`rounded-2xl border px-4 py-3 ${
                        item.id === focusedItemId ? 'border-white/30 bg-white/10' : 'border-white/10 bg-slate-950/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="mt-1 text-xs text-white/55">
                            {item.allDay ? 'All day' : `${formatTimeLabel(item.startTime)} - ${formatTimeLabel(item.endTime)}`}
                          </p>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                          {getCategoryMeta(item.category).shortLabel}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

import { format } from 'date-fns';
import { ExternalLink, Layers3, MapPin, Utensils, X } from 'lucide-react';
import { getCategoryMeta } from '../../domain/categories';
import { formatDateTimeRange, formatRoleLabel, formatTimeLabel } from '../../lib/formatters';
import type { PersonalCalendarItem } from '../../types/PersonalCalendar';

type Props = {
  date: Date | null;
  focusedItemId?: string | null;
  items: PersonalCalendarItem[];
  onClose: () => void;
  onFocusItem?: (id: string) => void;
  open: boolean;
  onEditFocusedItem?: () => void;
};

const categoryTint: Record<string, string> = {
  school_wide: 'border-[#6B5CA5] bg-[#F1EEFA] text-[#3f3670]',
  academic: 'border-[#2B4C7E] bg-[#EEF4FB] text-[#223f6b]',
  club: 'border-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  society: 'border-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  supw: 'border-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  sta: 'border-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  centre_of_excellence: 'border-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  meals: 'border-[#B98222] bg-[#FFF6E6] text-[#805616]'
};

export function PersonalDaySheet({ date, focusedItemId, items, onClose, onFocusItem, open, onEditFocusedItem }: Props) {
  if (!open || !date) return null;

  const allDayItems = items.filter((item) => item.allDay);
  const timedItems = items
    .filter((item) => !item.allDay)
    .sort((left, right) => {
      const startCompare = new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
      if (startCompare !== 0) return startCompare;
      return new Date(left.endTime).getTime() - new Date(right.endTime).getTime();
    });
  const focusedItem = items.find((item) => item.id === focusedItemId) ?? null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[rgba(24,38,56,0.16)] text-[var(--text)]">
      <div className="flex h-full w-full max-w-4xl flex-col border-l border-[color:var(--line)] bg-[var(--paper-card)] shadow-[0_24px_60px_rgba(86,72,49,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line)] bg-[var(--paper-soft)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brass)]">Day agenda</p>
            <h2 className="serif-display mt-1 text-3xl font-semibold text-[var(--text-strong)]">{format(date, 'EEEE, d MMMM')}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {items.length === 0 ? 'No personal items for this day.' : `${items.length} personal item${items.length === 1 ? '' : 's'} mapped.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {focusedItem && onEditFocusedItem ? (
              <button
                type="button"
                onClick={onEditFocusedItem}
                className="rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm text-[var(--text-strong)] transition hover:bg-white"
              >
                Edit event
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] p-2 text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
              aria-label="Close day view"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-y-auto px-6 py-6">
            {allDayItems.length > 0 ? (
              <section className="mb-6 rounded-[12px] border border-[color:var(--line)] bg-[var(--paper-card)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">All day</p>
                <div className="mt-4 grid gap-3">
                  {allDayItems.map((item) => {
                    const category = getCategoryMeta(item.category);
                    return (
                      <button key={item.id} type="button" onClick={() => onFocusItem?.(item.id)} className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel-2)] p-4 text-left transition hover:bg-white">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-[8px] border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${categoryTint[item.category] ?? categoryTint.school_wide}`}>
                            {category.shortLabel}
                          </span>
                          {item.relatedGroup ? (
                            <span className="rounded-[8px] border border-[color:var(--line)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              {item.relatedGroup.name}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-lg font-semibold text-[var(--text-strong)]">{item.title}</p>
                        {item.description ? <p className="mt-2 text-sm text-[var(--text-muted)]">{item.description}</p> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {timedItems.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[color:var(--line)] bg-[var(--paper-card)] p-6 text-sm text-[var(--text-muted)]">
                No timed items are mapped for this day yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[12px] border border-[color:var(--line)] bg-[var(--paper-card)]">
                {timedItems.map((item) => {
                  const category = getCategoryMeta(item.category);
                  const focused = item.id === focusedItemId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onFocusItem?.(item.id)}
                      className={`grid w-full gap-4 border-t border-l-[3px] px-4 py-3 text-left transition first:border-t-0 md:grid-cols-[92px_minmax(0,1fr)] ${
                        focused
                          ? `${categoryTint[item.category] ?? categoryTint.school_wide} ring-1 ring-inset ring-[var(--academic-blue)]/40`
                          : 'border-l-transparent border-t-[color:var(--line-soft)] hover:bg-[var(--paper-soft)]'
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
                        {formatTimeLabel(item.startTime)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{item.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {formatTimeLabel(item.startTime)} - {formatTimeLabel(item.endTime)}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">{category.shortLabel}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                          {item.metadata?.blockName ? <span>{item.metadata.blockName}</span> : null}
                          {item.location ? <span>{item.location}</span> : null}
                          {item.source === 'meal_schedule' ? (
                            <span className="inline-flex items-center gap-1">
                              <Utensils className="size-3.5" /> Meal block
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="overflow-y-auto border-t border-[color:var(--line)] bg-[color:var(--paper-soft)] px-6 py-6 lg:border-l lg:border-t-0">
            {focusedItem ? (
              <section className="rounded-[12px] border border-[color:var(--line)] bg-[var(--paper-card)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">Focused item</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{focusedItem.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{formatDateTimeRange(focusedItem.startTime, focusedItem.endTime)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-[8px] border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${categoryTint[focusedItem.category] ?? categoryTint.school_wide}`}>
                    {getCategoryMeta(focusedItem.category).label}
                  </span>
                  {focusedItem.relatedGroup ? (
                    <span className="rounded-[8px] border border-[color:var(--line)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {focusedItem.relatedGroup.name}
                    </span>
                  ) : null}
                </div>
                {focusedItem.description ? <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{focusedItem.description}</p> : null}
                <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                  {focusedItem.location ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--text-faint)]" />
                      <span>{focusedItem.location}</span>
                    </div>
                  ) : null}
                  {focusedItem.metadata?.teacher ? (
                    <div className="flex items-start gap-2">
                      <Layers3 className="mt-0.5 size-4 shrink-0 text-[var(--text-faint)]" />
                      <span>{focusedItem.metadata.teacher}</span>
                    </div>
                  ) : null}
                  {focusedItem.author?.name ? (
                    <div className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel-2)] p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">Posted by</p>
                      <p className="mt-2 font-medium text-[var(--text-strong)]">{focusedItem.author.name}</p>
                      {focusedItem.author.email ? <p className="text-xs text-[var(--text-muted)]">{focusedItem.author.email}</p> : null}
                      {focusedItem.author.role ? <p className="mt-1 text-xs text-[var(--text-faint)]">{formatRoleLabel(focusedItem.author.role)}</p> : null}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 space-y-2">
                  {focusedItem.classroomLink ? (
                    <a
                      href={focusedItem.classroomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-4 py-3 text-sm text-[var(--text-strong)] transition hover:bg-white"
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
                      className="flex items-center justify-between rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-4 py-3 text-sm text-[var(--text-strong)] transition hover:bg-white"
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
                      className="flex items-center justify-between rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-4 py-3 text-sm text-[var(--text-strong)] transition hover:bg-white"
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
                      className="flex items-center justify-between rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-4 py-3 text-sm text-[var(--text-strong)] transition hover:bg-white"
                    >
                      {link.label}
                      <ExternalLink className="size-4" />
                    </a>
                  ))}
                </div>
                {focusedItem.hiddenPrivateLinks ? (
                  <p className="mt-4 rounded-[10px] border border-dashed border-[color:var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    Private links are hidden until your membership is approved.
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="rounded-[12px] border border-dashed border-[color:var(--line)] bg-[var(--paper-card)] p-5 text-sm text-[var(--text-muted)]">
                Select an item in the day to inspect links, author metadata, and timing detail.
              </section>
            )}

            <section className="mt-4 rounded-[12px] border border-[color:var(--line)] bg-[var(--paper-card)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">Day list</p>
              <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">Nothing mapped for this day yet.</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={`${item.id}:summary`}
                      type="button"
                      onClick={() => onFocusItem?.(item.id)}
                      className={`w-full rounded-[10px] border px-4 py-3 text-left ${
                        item.id === focusedItemId ? 'border-[var(--academic-blue)] bg-[var(--academic-blue-soft)]' : 'border-[color:var(--line)] bg-[color:var(--panel-2)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-strong)]">{item.title}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {item.allDay ? 'All day' : `${formatTimeLabel(item.startTime)} - ${formatTimeLabel(item.endTime)}`}
                          </p>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-[var(--text-faint)]">
                          {getCategoryMeta(item.category).shortLabel}
                        </span>
                      </div>
                    </button>
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

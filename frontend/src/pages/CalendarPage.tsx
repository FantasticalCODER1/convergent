import { startTransition, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { PersonalDaySheet } from '../components/calendar/PersonalDaySheet';
import { getCategoryMeta } from '../domain/categories';
import { usePersonalCalendar } from '../hooks/usePersonalCalendar';
import { formatDateTimeRange, formatTimeLabel } from '../lib/formatters';
import { getItemsForDay } from '../services/personalCalendarService';
import type { OverviewFilterKey, PersonalCalendarItem } from '../types/PersonalCalendar';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function matchesOverviewFilter(item: PersonalCalendarItem, activeFilter: OverviewFilterKey) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'academic') return item.source === 'academic_schedule';
  if (activeFilter === 'groups') return item.source === 'group_event';
  if (activeFilter === 'school_wide') return item.source === 'school_event';
  if (activeFilter === 'meals') return item.source === 'meal_schedule';
  return true;
}

function buildMonthDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days: Date[] = [];

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }

  return days;
}

function getSourceSummary(items: PersonalCalendarItem[], scheduleDatasets: ReturnType<typeof usePersonalCalendar>['scheduleDatasets']) {
  const scheduleTitles = scheduleDatasets
    .filter((dataset) => dataset.status === 'ready')
    .map((dataset) => dataset.title);
  const eventDatasets = Array.from(
    new Set(items.map((item) => item.metadata?.sourceDataset).filter((value): value is string => !!value))
  );

  if (scheduleTitles.length === 0 && eventDatasets.length === 0) {
    return 'No live calendar datasets are connected yet.';
  }

  return [...scheduleTitles, ...eventDatasets].join(' • ');
}

function getPreviewItems(items: PersonalCalendarItem[]) {
  return [...items]
    .sort((left, right) => {
      if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
      return left.startTime.localeCompare(right.startTime);
    })
    .slice(0, 3);
}

export default function CalendarPage() {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<OverviewFilterKey>('all');

  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const visibleRange = useMemo(
    () => ({
      start: monthDays[0],
      end: monthDays[monthDays.length - 1]
    }),
    [monthDays]
  );

  const { items, upcomingItems, readiness, loading, scheduleDatasets } = usePersonalCalendar({
    rangeStart: visibleRange.start,
    rangeEnd: visibleRange.end
  });

  const availableFilters = useMemo(() => {
    const filters: Array<{ id: OverviewFilterKey; label: string }> = [{ id: 'all', label: 'All' }];
    if (items.some((item) => item.source === 'academic_schedule')) filters.push({ id: 'academic', label: 'Classes' });
    if (items.some((item) => item.source === 'meal_schedule')) filters.push({ id: 'meals', label: 'Meals' });
    if (items.some((item) => item.source === 'school_event')) filters.push({ id: 'school_wide', label: 'School-wide' });
    if (items.some((item) => item.source === 'group_event')) filters.push({ id: 'groups', label: 'Groups' });
    return filters;
  }, [items]);

  const filteredItems = useMemo(() => items.filter((item) => matchesOverviewFilter(item, activeFilter)), [activeFilter, items]);
  const selectedDayItems = useMemo(() => getItemsForDay(filteredItems, selectedDate), [filteredItems, selectedDate]);
  const populatedDayCount = useMemo(
    () => monthDays.filter((day) => getItemsForDay(filteredItems, day).length > 0).length,
    [filteredItems, monthDays]
  );
  const sourceSummary = useMemo(() => getSourceSummary(filteredItems, scheduleDatasets), [filteredItems, scheduleDatasets]);

  const openDay = (day: Date, focusedId?: string | null) => {
    setSelectedDate(day);
    setFocusedItemId(focusedId ?? null);
  };

  const changeMonth = (direction: -1 | 1) => {
    startTransition(() => {
      const nextMonth = direction === -1 ? subMonths(visibleMonth, 1) : addMonths(visibleMonth, 1);
      setVisibleMonth(nextMonth);
      setSelectedDate(startOfMonth(nextMonth));
      setFocusedItemId(null);
    });
  };

  if (loading) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center text-white/70 shadow-glass">
        Loading the calendar view…
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <EmptyStateCard
        eyebrow="Calendar"
        title={readiness.profileReady ? 'No mapped calendar items are live yet' : 'Finish your profile mapping first'}
        body={
          readiness.profileReady
            ? 'The month grid is ready, but no live timetable, meal, or visible school events are connected for this range yet.'
            : 'Grade and section are still needed before timetable and meal data can map cleanly into the month view.'
        }
        tone="accent"
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Calendar</p>
          <h1 className="text-3xl font-semibold text-white">Month view</h1>
          <p className="mt-2 max-w-3xl text-white/60">
            The calendar is now the primary student surface: a conventional month grid for scanning time, with a selected-day detail rail for inspection and a deeper day sheet when needed.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Visible items" value={String(filteredItems.length)} hint={`Across ${format(visibleMonth, 'MMMM yyyy')}`} />
          <StatCard label="Populated days" value={String(populatedDayCount)} hint="Days with mapped schedule or event data" />
          <StatCard label="Upcoming" value={String(upcomingItems.length)} hint="Queued personal items" />
        </div>
      </header>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-glass">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  const today = new Date();
                  setVisibleMonth(startOfMonth(today));
                  setSelectedDate(today);
                  setFocusedItemId(null);
                });
              }}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="ml-2">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Current month</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{format(visibleMonth, 'MMMM yyyy')}</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableFilters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-glass">
          <div className="grid grid-cols-7 border-b border-white/10 pb-2">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-2 text-sm font-medium text-white/55">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dayItems = getItemsForDay(filteredItems, day);
              const previewItems = getPreviewItems(dayItems);
              const overflowCount = Math.max(0, dayItems.length - previewItems.length);
              const selected = isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => openDay(day)}
                  className={`min-h-[148px] cursor-pointer border-b border-r border-white/10 px-2 py-2 transition ${
                    selected ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${isSameMonth(day, visibleMonth) ? 'text-white' : 'text-white/35'}`}>
                      {format(day, 'd')}
                    </span>
                    {isToday(day) ? <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-cyan-100">Today</span> : null}
                  </div>

                  <div className="mt-3 space-y-1">
                    {previewItems.map((item) => {
                      const category = getCategoryMeta(item.category);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDay(day, item.id);
                          }}
                          className={`block w-full rounded-xl border px-2 py-1 text-left text-[11px] transition hover:bg-white/10 ${
                            categoryTint[item.category] ?? categoryTint.school_wide
                          }`}
                        >
                          <div className="truncate font-semibold text-white">{item.title}</div>
                          <div className="truncate text-white/70">
                            {item.allDay ? category.shortLabel : `${formatTimeLabel(item.startTime)} · ${category.shortLabel}`}
                          </div>
                        </button>
                      );
                    })}
                    {overflowCount > 0 ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDay(day);
                        }}
                        className="text-xs text-white/45 transition hover:text-white"
                      >
                        +{overflowCount} more
                      </button>
                    ) : null}
                    {dayItems.length === 0 ? <div className="pt-4 text-xs text-white/20">No items</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Selected day</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{format(selectedDate, 'EEEE, d MMMM')}</h2>
            <p className="mt-2 text-sm text-white/60">
              {selectedDayItems.length === 0 ? 'No mapped items on this date.' : `${selectedDayItems.length} mapped item${selectedDayItems.length === 1 ? '' : 's'} on this date.`}
            </p>

            {selectedDayItems.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/55">
                Empty days stay quiet. The month grid remains navigable without injecting fake activity.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedDayItems.map((item) => {
                  const category = getCategoryMeta(item.category);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFocusedItemId(item.id);
                        setDayViewDate(selectedDate);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:bg-white/10 ${
                        categoryTint[item.category] ?? categoryTint.school_wide
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-xs text-white/70">{formatDateTimeRange(item.startTime, item.endTime)}</p>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-white/55">{category.shortLabel}</span>
                      </div>
                      <p className="mt-2 truncate text-xs text-white/60">
                        {item.relatedGroup?.name ?? item.metadata?.blockName ?? item.location ?? 'Personal calendar item'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setDayViewDate(selectedDate)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              Open day detail
              <ExternalLink className="size-4" />
            </button>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Source of truth</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Live calendar inputs</h2>
            <p className="mt-4 text-sm text-white/70">{sourceSummary}</p>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <StatusRow label="Academic datasets" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} matched`} />
              <StatusRow label="Meal datasets" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} matched`} />
              <StatusRow label="Profile mapping" value={readiness.profileReady ? 'Ready' : 'Needs grade and section'} />
            </div>
          </section>
        </aside>
      </div>

      <PersonalDaySheet
        open={!!dayViewDate}
        date={dayViewDate}
        items={dayViewDate ? getItemsForDay(filteredItems, dayViewDate) : []}
        focusedItemId={focusedItemId}
        onClose={() => {
          setDayViewDate(null);
          setFocusedItemId(null);
        }}
      />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-glass">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/50">{hint}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
      <span className="text-white/50">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}

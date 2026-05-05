import { startTransition, useEffect, useMemo, useState } from 'react';
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
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import { PersonalDaySheet } from '../components/calendar/PersonalDaySheet';
import { MetricCard, PageHeader, SectionButton, StatRow, SurfaceSection } from '../components/ui/product';
import { getCategoryMeta } from '../domain/categories';
import { usePersonalCalendar } from '../hooks/usePersonalCalendar';
import { formatDateTimeRange, formatTimeLabel } from '../lib/formatters';
import { getItemsForDay } from '../services/personalCalendarService';
import type { OverviewFilterKey, PersonalCalendarItem } from '../types/PersonalCalendar';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FILTER_OPTIONS: Array<{ id: OverviewFilterKey; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'academic', label: 'Academic' },
  { id: 'groups', label: 'Clubs/Societies' },
  { id: 'school_wide', label: 'School-wide' },
  { id: 'meals', label: 'Meals' }
];

const categoryBarClasses: Record<string, string> = {
  school_wide: 'border-l-[#6B5CA5] bg-[#F1EEFA] text-[#3f3670]',
  academic: 'border-l-[#2B4C7E] bg-[#EEF4FB] text-[#223f6b]',
  club: 'border-l-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  society: 'border-l-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  supw: 'border-l-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  sta: 'border-l-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  centre_of_excellence: 'border-l-[#2F7D5C] bg-[#ECF7F1] text-[#245f47]',
  meals: 'border-l-[#B98222] bg-[#FFF6E6] text-[#805616]',
  records: 'border-l-[#52616F] bg-[#F2F4F6] text-[#394653]'
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
  const scheduleTitles = scheduleDatasets.filter((dataset) => dataset.status === 'ready').map((dataset) => dataset.title);
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
    .slice(0, 4);
}

function dayKey(day: Date) {
  return format(day, 'yyyy-MM-dd');
}

export default function CalendarPage() {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<OverviewFilterKey>('all');
  const [selectedGroupId, setSelectedGroupId] = useState('all');

  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const visibleRange = useMemo(
    () => ({
      start: monthDays[0],
      end: monthDays[monthDays.length - 1]
    }),
    [monthDays]
  );

  const { items, clubs, upcomingItems, readiness, loading, scheduleDatasets } = usePersonalCalendar({
    rangeStart: visibleRange.start,
    rangeEnd: visibleRange.end
  });

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (!matchesOverviewFilter(item, activeFilter)) return false;
        if (selectedGroupId !== 'all' && item.relatedGroup?.id !== selectedGroupId) return false;
        return true;
      }),
    [activeFilter, items, selectedGroupId]
  );

  const itemsByDay = useMemo(() => {
    return monthDays.reduce<Record<string, PersonalCalendarItem[]>>((acc, day) => {
      acc[dayKey(day)] = getItemsForDay(filteredItems, day);
      return acc;
    }, {});
  }, [filteredItems, monthDays]);

  const selectedDayItems = useMemo(
    () =>
      [...(itemsByDay[dayKey(selectedDate)] ?? [])].sort((left, right) => {
        if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
        return left.startTime.localeCompare(right.startTime);
      }),
    [itemsByDay, selectedDate]
  );
  const populatedDayCount = useMemo(
    () => monthDays.filter((day) => (itemsByDay[dayKey(day)] ?? []).length > 0).length,
    [itemsByDay, monthDays]
  );
  const sourceSummary = useMemo(() => getSourceSummary(filteredItems, scheduleDatasets), [filteredItems, scheduleDatasets]);
  const focusedItem = selectedDayItems.find((item) => item.id === focusedItemId) ?? selectedDayItems[0] ?? null;

  const groupOptions = useMemo(() => {
    const relatedGroups = new Map<string, string>();
    clubs.forEach((club) => relatedGroups.set(club.id, club.name));
    filteredItems.forEach((item) => {
      if (item.relatedGroup?.id && item.relatedGroup?.name) {
        relatedGroups.set(item.relatedGroup.id, item.relatedGroup.name);
      }
    });
    return Array.from(relatedGroups.entries()).map(([id, name]) => ({ id, name }));
  }, [clubs, filteredItems]);

  const openDay = (day: Date, focusedId?: string | null) => {
    setSelectedDate(day);
    if (!isSameMonth(day, visibleMonth)) {
      setVisibleMonth(startOfMonth(day));
    }
    setFocusedItemId(focusedId ?? null);
  };

  const moveSelectedDay = (delta: -1 | 1) => {
    const nextDay = addDays(selectedDate, delta);
    startTransition(() => openDay(nextDay));
  };

  const changeMonth = (direction: -1 | 1) => {
    startTransition(() => {
      const nextMonth = direction === -1 ? subMonths(visibleMonth, 1) : addMonths(visibleMonth, 1);
      setVisibleMonth(nextMonth);
      setSelectedDate(startOfMonth(nextMonth));
      setFocusedItemId(null);
    });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, button, a')) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveSelectedDay(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveSelectedDay(1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedDate, visibleMonth]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Calendar"
        title="Planner"
        description="Month view for classes, meals, clubs, and school events."
        aside={
          <div className="hidden gap-2 sm:grid sm:grid-cols-3">
            <MetricCard label="Visible items" value={String(filteredItems.length)} hint={`Across ${format(visibleMonth, 'MMMM yyyy')}`} />
            <MetricCard label="Active days" value={String(populatedDayCount)} hint="With mapped entries" />
            <MetricCard label="Upcoming" value={String(upcomingItems.length)} hint="Personal queue" />
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-[14px] border border-[color:var(--line)] bg-[var(--paper-card)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[color:var(--line)] bg-[rgba(248,245,238,0.78)] px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] text-[var(--text-muted)] transition hover:bg-[var(--paper-soft)] hover:text-[var(--text-strong)]"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <h2 className="serif-display min-w-[190px] text-[1.5rem] font-semibold text-[var(--text-strong)]">{format(visibleMonth, 'MMMM yyyy')}</h2>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] text-[var(--text-muted)] transition hover:bg-[var(--paper-soft)] hover:text-[var(--text-strong)]"
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
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
                  className="rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[var(--paper-soft)]"
                >
                  Today
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((filter) => (
                  <SectionButton key={filter.id} active={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>
                    {filter.label}
                  </SectionButton>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div className="truncate rounded-[10px] border border-[color:var(--line)] bg-[rgba(255,253,248,0.7)] px-3 py-2 text-sm text-[var(--text-muted)]">
                {sourceSummary}
              </div>
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                className="rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-3 py-2 text-sm text-[var(--text-strong)]"
                aria-label="Group filter"
              >
                <option value="all">All groups</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <StatRow label="Profile" value={readiness.profileReady ? 'Ready' : 'Pending'} />
              <StatRow label="Academic" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched}`} />
              <StatRow label="Meals" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched}`} />
            </div>
          </div>

          <div className="sm:hidden border-b border-[color:var(--line)] bg-[var(--paper-soft)] px-4 py-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">Selected day</p>
            <p className="mt-1 text-base font-semibold text-[var(--text-strong)]">{format(selectedDate, 'EEEE, d MMMM')}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {selectedDayItems.length === 0 ? 'No items mapped.' : `${selectedDayItems.length} item${selectedDayItems.length === 1 ? '' : 's'} mapped.`}
            </p>
          </div>

          {loading ? (
            <LoadingScreen compact label="Loading calendar data" />
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-[color:var(--line)] bg-[color:var(--paper-muted)] px-2 py-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="px-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[var(--brass)] sm:px-3">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-[var(--paper-card)]">
                {monthDays.map((day) => {
                  const dayItems = itemsByDay[dayKey(day)] ?? [];
                  const previewItems = getPreviewItems(dayItems);
                  const overflowCount = Math.max(0, dayItems.length - previewItems.length);
                  const selected = isSameDay(day, selectedDate);
                  const outsideMonth = !isSameMonth(day, visibleMonth);

                  return (
                    <div
                      key={day.toISOString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDay(day)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openDay(day);
                        }
                      }}
                      className={clsx(
                        'planner-grid-cell min-h-[72px] border-b border-r border-[color:var(--line-soft)] px-1.5 py-2 text-left transition sm:min-h-[108px] sm:px-2.5',
                        selected
                          ? 'bg-[var(--academic-blue-soft)] ring-1 ring-inset ring-[var(--academic-blue-line)]'
                          : outsideMonth
                            ? 'bg-[rgba(241,231,214,0.42)] text-[var(--text-faint)] hover:bg-[rgba(241,231,214,0.58)]'
                            : 'hover:bg-[rgba(255,246,216,0.42)]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={clsx('text-sm font-semibold', outsideMonth ? 'text-[var(--text-faint)]' : 'text-[var(--text-strong)]')}>
                          {format(day, 'd')}
                        </span>
                        {isToday(day) ? (
                          <span className="rounded-[6px] border border-[color:var(--gold-line)] bg-[color:var(--gold-soft)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--brass)]">
                            Today
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 space-y-1">
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
                              className={clsx(
                                'hidden w-full border-l-[3px] px-2 py-1 text-left text-[11px] leading-4 transition hover:translate-x-0.5 sm:block',
                                categoryBarClasses[item.category] ?? categoryBarClasses.school_wide
                              )}
                            >
                              <div className="truncate font-semibold">{item.title}</div>
                              <div className="truncate opacity-80">
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
                            className="hidden text-[11px] font-semibold text-[var(--academic-blue)] transition hover:text-[var(--text-strong)] sm:inline-flex"
                          >
                            +{overflowCount} more
                          </button>
                        ) : null}
                        {dayItems.length > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDay(day);
                            }}
                            className="mt-1 inline-flex text-[10px] font-semibold text-[var(--academic-blue)] sm:hidden"
                          >
                            {dayItems.length}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <SurfaceSection
            eyebrow="Selected day"
            title={format(selectedDate, 'EEEE, d MMMM')}
            description={
              selectedDayItems.length === 0
                ? 'No mapped items.'
                : `${selectedDayItems.length} item${selectedDayItems.length === 1 ? '' : 's'} mapped.`
            }
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveSelectedDay(-1)}
                  className="rounded-[10px] border border-[color:var(--line)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSelectedDay(1)}
                  className="rounded-[10px] border border-[color:var(--line)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
                  aria-label="Next day"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            }
          >
            {selectedDayItems.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-[color:var(--line)] bg-[color:var(--paper-soft)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                The planner has no class, meal, club, or school item on this date.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[12px] border border-[color:var(--line)] bg-[var(--paper-card)]">
                {selectedDayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFocusedItemId(item.id)}
                    className={clsx(
                      'w-full border-t border-l-[3px] px-3 py-3 text-left transition first:border-t-0',
                      item.id === focusedItemId || (!focusedItemId && item.id === selectedDayItems[0]?.id)
                        ? `${categoryBarClasses[item.category] ?? categoryBarClasses.school_wide} border-t-[color:var(--line-soft)]`
                        : 'border-l-transparent border-t-[color:var(--line-soft)] bg-[var(--paper-card)] hover:bg-[var(--paper-soft)]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-strong)]">{item.title}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDateTimeRange(item.startTime, item.endTime)}</p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">{item.relatedGroup?.name ?? getCategoryMeta(item.category).shortLabel}</span>
                    </div>
                    {item.location ? <p className="mt-2 text-xs text-[var(--text-muted)]">{item.location}</p> : null}
                  </button>
                ))}
              </div>
            )}

            {focusedItem ? (
              <div className="mt-4 rounded-[12px] border border-[color:var(--line)] bg-[color:var(--paper-soft)] p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--brass)]">Focused item</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-strong)]">{focusedItem.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{formatDateTimeRange(focusedItem.startTime, focusedItem.endTime)}</p>
                {focusedItem.description ? <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{focusedItem.description}</p> : null}
                <div className="mt-3">
                  {focusedItem.location ? <StatRow label="Location" value={focusedItem.location} subdued /> : null}
                  {focusedItem.metadata?.teacher ? <StatRow label="Teacher" value={focusedItem.metadata.teacher} subdued /> : null}
                  {focusedItem.metadata?.blockName ? <StatRow label="Block" value={focusedItem.metadata.blockName} subdued /> : null}
                </div>
                <div className="mt-3 space-y-2">
                  {focusedItem.classroomLink ? (
                    <a
                      href={focusedItem.classroomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-3 py-2.5 text-sm text-[var(--text-strong)] transition hover:bg-white"
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
                      className="flex items-center justify-between rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-3 py-2.5 text-sm text-[var(--text-strong)] transition hover:bg-white"
                    >
                      Open Classroom post
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {focusedItem.meetLink ? (
                    <a
                      href={focusedItem.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-[10px] border border-[color:var(--line)] bg-[var(--paper-card)] px-3 py-2.5 text-sm text-[var(--text-strong)] transition hover:bg-white"
                    >
                      Open Meet
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setDayViewDate(selectedDate)}
              className="mt-4 w-full rounded-[10px] border border-[color:var(--academic-blue-line)] bg-[var(--academic-blue-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--academic-blue)] transition hover:bg-white"
            >
              Open day agenda
            </button>
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Calendar context"
            title="Scope and sources"
          >
            <div>
              <StatRow label="Profile mapping" value={readiness.profileReady ? 'Ready' : 'Pending'} />
              <StatRow label="Academic datasets" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} mapped`} />
              <StatRow label="Meal datasets" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} mapped`} />
              <StatRow label="Month source summary" value={sourceSummary} />
            </div>
          </SurfaceSection>
        </aside>
      </div>

      <PersonalDaySheet
        date={dayViewDate}
        focusedItemId={focusedItemId}
        items={dayViewDate ? getItemsForDay(filteredItems, dayViewDate) : []}
        onClose={() => setDayViewDate(null)}
        onFocusItem={setFocusedItemId}
        open={!!dayViewDate}
      />
    </div>
  );
}

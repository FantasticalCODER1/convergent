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
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
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
  school_wide: 'border-l-sky-300 bg-sky-400/10 text-sky-50',
  academic: 'border-l-amber-300 bg-amber-300/10 text-amber-50',
  club: 'border-l-indigo-300 bg-indigo-400/10 text-indigo-50',
  society: 'border-l-emerald-300 bg-emerald-400/10 text-emerald-50',
  supw: 'border-l-orange-300 bg-orange-400/10 text-orange-50',
  sta: 'border-l-pink-300 bg-pink-400/10 text-pink-50',
  centre_of_excellence: 'border-l-teal-300 bg-teal-400/10 text-teal-50',
  meals: 'border-l-yellow-200 bg-yellow-200/10 text-yellow-50'
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

  const selectedDayItems = itemsByDay[dayKey(selectedDate)] ?? [];
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Personal calendar"
        description="The calendar is now treated as the strongest product surface: a month grid for scanning time, a selected-day rail for detail, and explicit signals about what this environment can and cannot yet map."
        aside={
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Visible items" value={String(filteredItems.length)} hint={`Across ${format(visibleMonth, 'MMMM yyyy')}`} />
            <MetricCard label="Populated days" value={String(populatedDayCount)} hint="Days with mapped schedule or event data" />
            <MetricCard label="Upcoming" value={String(upcomingItems.length)} hint="Queued personal items" />
          </div>
        }
      />

      <SurfaceSection
        eyebrow="Planner controls"
        title={format(visibleMonth, 'MMMM yyyy')}
        description="Month controls, category filters, and the day rail stay clearly separated so the grid can do the primary visual work."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 text-[var(--text-muted)] transition hover:bg-white/8 hover:text-[var(--text-strong)]"
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
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 text-[var(--text-muted)] transition hover:bg-white/8 hover:text-[var(--text-strong)]"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="rounded-full border border-white/10 bg-[rgba(10,15,27,0.26)] px-4 py-2 text-sm text-[var(--text-muted)]">
                {sourceSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((filter) => (
                <SectionButton key={filter.id} active={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>
                  {filter.label}
                </SectionButton>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-[rgba(10,15,27,0.34)] p-4">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">View context</p>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-sm">
                <span className="text-[var(--text-muted)]">Group</span>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-[rgba(13,19,34,0.58)] px-4 py-3 text-[var(--text-strong)]"
                >
                  <option value="all">All groups</option>
                  {groupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <StatRow label="Academic coverage" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} mapped`} subdued />
              <StatRow label="Meal coverage" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} mapped`} subdued />
            </div>
          </div>
        </div>
      </SurfaceSection>

      {(readiness.academicStatus === 'missing' || readiness.mealStatus === 'missing' || !readiness.profileReady) && (
        <SurfaceSection
          eyebrow="Calendar scope"
          title={!readiness.profileReady ? 'Finish profile mapping to unlock timetable coverage' : 'Timetable and meals are not fully live yet'}
          description={
            !readiness.profileReady
              ? 'Grade and section are still required before academic and meal blocks can map into the planner. School-wide and approved club events will continue to appear when available.'
              : 'The planner still renders as a real calendar, but timetable and meal coverage remain limited in this environment. School-wide and approved club activity stay visible without pretending broader data exists.'
          }
          tone="accent"
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SurfaceSection eyebrow="Month grid" title="Planner" className="overflow-hidden p-0" contentClassName="mt-0">
          {loading ? (
            <div className="px-6 py-8 text-sm text-[var(--text-muted)]">Loading calendar data…</div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-white/10 bg-[rgba(10,15,27,0.2)] px-2 py-3">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="px-3 text-sm font-medium text-[var(--text-muted)]">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-[linear-gradient(180deg,rgba(17,24,43,0.74),rgba(11,16,28,0.74))]">
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
                        'planner-grid-cell min-h-[132px] border-b border-r border-white/8 px-3 py-3 text-left transition sm:min-h-[146px]',
                        selected ? 'bg-[rgba(37,53,83,0.92)]' : outsideMonth ? 'bg-[rgba(8,12,22,0.4)] hover:bg-[rgba(18,24,40,0.7)]' : 'hover:bg-[rgba(18,24,40,0.7)]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={clsx('text-sm font-semibold', outsideMonth ? 'text-white/35' : 'text-[var(--text-strong)]')}>
                          {format(day, 'd')}
                        </span>
                        {isToday(day) ? (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-100">
                            Today
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1.5">
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
                                'block w-full rounded-[12px] border border-white/6 border-l-[3px] px-2.5 py-1.5 text-left text-[11px] leading-4 transition hover:bg-white/10',
                                categoryBarClasses[item.category] ?? categoryBarClasses.school_wide
                              )}
                            >
                              <div className="truncate font-medium text-[var(--text-strong)]">{item.title}</div>
                              <div className="mt-0.5 truncate text-white/70">
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
                            className="text-[11px] font-medium text-[var(--accent-2)] transition hover:text-white"
                          >
                            +{overflowCount} more
                          </button>
                        ) : null}
                        {dayItems.length === 0 ? <div className="pt-4 text-[11px] text-white/20"> </div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SurfaceSection>

        <div className="space-y-6">
          <SurfaceSection
            eyebrow="Selected day"
            title={format(selectedDate, 'EEEE, d MMMM')}
            description={
              selectedDayItems.length === 0
                ? 'No mapped items sit on this date. Quiet days remain quiet instead of being padded with filler activity.'
                : `${selectedDayItems.length} mapped item${selectedDayItems.length === 1 ? '' : 's'} on this date.`
            }
            action={
              <button
                type="button"
                onClick={() => setDayViewDate(selectedDate)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
              >
                Open day view
              </button>
            }
          >
            {selectedDayItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.24)] px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
                Empty days stay intentionally calm. The right rail still keeps the selected-date context visible so the month grid remains legible as you move around it.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFocusedItemId(item.id)}
                    className={clsx(
                      'w-full rounded-[22px] border px-4 py-4 text-left transition',
                      item.id === focusedItemId || (!focusedItemId && item.id === selectedDayItems[0]?.id)
                        ? 'border-white/18 bg-[rgba(27,39,63,0.92)]'
                        : 'border-white/8 bg-[rgba(10,15,27,0.34)] hover:bg-[rgba(17,24,43,0.7)]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--text-strong)]">{item.title}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{formatDateTimeRange(item.startTime, item.endTime)}</p>
                      </div>
                      <span className="text-sm text-[var(--text-muted)]">{item.relatedGroup?.name ?? getCategoryMeta(item.category).shortLabel}</span>
                    </div>
                    {item.location ? <p className="mt-3 text-sm text-[var(--text-muted)]">{item.location}</p> : null}
                  </button>
                ))}
              </div>
            )}

            {focusedItem ? (
              <div className="mt-5 rounded-[24px] border border-white/8 bg-[rgba(10,15,27,0.34)] p-5">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">Focused item</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-strong)]">{focusedItem.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{formatDateTimeRange(focusedItem.startTime, focusedItem.endTime)}</p>
                {focusedItem.description ? <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{focusedItem.description}</p> : null}
                <div className="mt-4 space-y-3">
                  {focusedItem.location ? <StatRow label="Location" value={focusedItem.location} subdued /> : null}
                  {focusedItem.metadata?.teacher ? <StatRow label="Teacher" value={focusedItem.metadata.teacher} subdued /> : null}
                </div>
                <div className="mt-4 space-y-2">
                  {focusedItem.classroomLink ? (
                    <a
                      href={focusedItem.classroomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-[18px] border border-white/10 px-4 py-3 text-sm text-[var(--text-strong)] transition hover:bg-white/8"
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
                      className="flex items-center justify-between rounded-[18px] border border-white/10 px-4 py-3 text-sm text-[var(--text-strong)] transition hover:bg-white/8"
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
                      className="flex items-center justify-between rounded-[18px] border border-white/10 px-4 py-3 text-sm text-[var(--text-strong)] transition hover:bg-white/8"
                    >
                      Open Meet
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </SurfaceSection>

          <SurfaceSection
            eyebrow="Calendar context"
            title="Scope and sources"
            description="This rail keeps the month view grounded in product truth rather than treating every empty slot as a missing design."
          >
            <div className="space-y-3">
              <StatRow label="Profile mapping" value={readiness.profileReady ? 'Ready' : 'Pending'} />
              <StatRow label="Academic datasets" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} mapped`} />
              <StatRow label="Meal datasets" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} mapped`} />
              <StatRow label="Month source summary" value={sourceSummary} />
            </div>
          </SurfaceSection>
        </div>
      </div>

      <PersonalDaySheet
        date={dayViewDate}
        focusedItemId={focusedItemId}
        items={dayViewDate ? getItemsForDay(filteredItems, dayViewDate) : []}
        onClose={() => setDayViewDate(null)}
        open={!!dayViewDate}
      />
    </div>
  );
}

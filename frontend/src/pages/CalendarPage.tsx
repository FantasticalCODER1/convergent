import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { endOfMonth, format, startOfMonth, subDays, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { PersonalDaySheet } from '../components/calendar/PersonalDaySheet';
import { EventEditor } from '../components/admin/EventEditor';
import { useAuth } from '../hooks/useAuth';
import { usePersonalCalendar } from '../hooks/usePersonalCalendar';
import { canManageClub } from '../lib/policy';
import { formatDateTimeRange, formatTimeLabel } from '../lib/formatters';
import { getItemsForDay } from '../services/personalCalendarService';
import type { EventRecord } from '../types/Event';
import type { OverviewFilterKey, PersonalCalendarItem } from '../types/PersonalCalendar';

const categoryTint: Record<string, string> = {
  school_wide: '#38bdf8',
  academic: '#f59e0b',
  club: '#818cf8',
  society: '#22c55e',
  supw: '#f97316',
  sta: '#ec4899',
  centre_of_excellence: '#14b8a6',
  meals: '#facc15'
};

type OverviewCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    kind: 'item' | 'academic_summary';
    itemId?: string;
    dateKey: string;
    summaryCount?: number;
  };
};

function buildOverviewEvents(items: PersonalCalendarItem[]) {
  const academicBuckets = new Map<string, PersonalCalendarItem[]>();
  const calendarEvents: OverviewCalendarEvent[] = [];

  items.forEach((item) => {
    const dateKey = item.startTime.slice(0, 10);
    if (item.source === 'academic_schedule') {
      academicBuckets.set(dateKey, [...(academicBuckets.get(dateKey) ?? []), item]);
      return;
    }

    calendarEvents.push({
      id: item.id,
      title: item.title,
      start: item.allDay ? item.startTime.slice(0, 10) : item.startTime,
      end: item.allDay ? item.endTime.slice(0, 10) : item.endTime,
      allDay: item.allDay,
      backgroundColor: categoryTint[item.category] ?? '#818cf8',
      borderColor: categoryTint[item.category] ?? '#818cf8',
      extendedProps: {
        kind: 'item',
        itemId: item.id,
        dateKey
      }
    });
  });

  academicBuckets.forEach((bucket, dateKey) => {
    if (bucket.length === 0) return;
    calendarEvents.push({
      id: `academic-summary:${dateKey}`,
      title: bucket.length === 1 ? bucket[0].title : `Academic · ${bucket.length} blocks`,
      start: bucket[0].startTime,
      end: bucket[bucket.length - 1].endTime,
      allDay: false,
      backgroundColor: categoryTint.academic,
      borderColor: categoryTint.academic,
      extendedProps: {
        kind: 'academic_summary',
        dateKey,
        summaryCount: bucket.length
      }
    });
  });

  return calendarEvents;
}

function matchesOverviewFilter(item: PersonalCalendarItem, activeFilter: OverviewFilterKey, selectedGroupId: string) {
  if (selectedGroupId && item.relatedGroup?.id !== selectedGroupId) return false;
  if (activeFilter === 'all') return true;
  if (activeFilter === 'academic') return item.source === 'academic_schedule';
  if (activeFilter === 'groups') return item.source === 'group_event';
  if (activeFilter === 'school_wide') return item.source === 'school_event';
  if (activeFilter === 'meals') return item.source === 'meal_schedule';
  return true;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<OverviewFilterKey>('all');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [inspectorDate, setInspectorDate] = useState<Date>(new Date());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [visibleRange, setVisibleRange] = useState({
    start: subDays(startOfMonth(new Date()), 7),
    end: addDays(endOfMonth(new Date()), 21)
  });

  const {
    items,
    upcomingItems,
    nextAcademicItem,
    nextMealItem,
    nextGroupItem,
    readiness,
    clubs,
    rawEvents,
    loading,
    saveEvent
  } = usePersonalCalendar({
    rangeStart: visibleRange.start,
    rangeEnd: visibleRange.end
  });

  const managedClubs = useMemo(() => clubs.filter((club) => canManageClub(user, club)), [clubs, user]);
  const activeGroups = useMemo(
    () => clubs.filter((club) => managedClubs.some((managed) => managed.id === club.id) || items.some((item) => item.relatedGroup?.id === club.id)),
    [clubs, items, managedClubs]
  );

  const filteredItems = useMemo(
    () => items.filter((item) => matchesOverviewFilter(item, activeFilter, selectedGroupId)),
    [activeFilter, items, selectedGroupId]
  );
  const overviewEvents = useMemo(() => buildOverviewEvents(filteredItems), [filteredItems]);
  const selectedDayItems = useMemo(() => getItemsForDay(items, inspectorDate), [inspectorDate, items]);
  const rawEventsById = useMemo(
    () =>
      rawEvents.reduce<Record<string, EventRecord>>((acc, event) => {
        acc[event.id] = event;
        return acc;
      }, {}),
    [rawEvents]
  );
  const focusedItem = items.find((item) => item.id === focusedItemId) ?? null;
  const focusedRawEvent = focusedItem?.sourceType === 'event' ? rawEventsById[focusedItem.sourceId] ?? null : null;
  const canEditFocusedEvent =
    !!focusedRawEvent &&
    (user?.role === 'admin' ||
      (!!focusedRawEvent.relatedGroupId &&
        managedClubs.some((club) => club.id === focusedRawEvent.relatedGroupId)));

  const filterOptions: Array<{ id: OverviewFilterKey; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'academic', label: 'Academic' },
    { id: 'groups', label: 'Clubs/Societies' },
    { id: 'school_wide', label: 'School-wide' },
    { id: 'meals', label: 'Meals' }
  ];

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps as OverviewCalendarEvent['extendedProps'];
    const nextDate = new Date(`${props.dateKey}T12:00:00`);
    setInspectorDate(nextDate);
    setDayViewDate(nextDate);
    setFocusedItemId(props.kind === 'item' ? props.itemId ?? null : null);
  };

  const handleDateClick = (arg: DateClickArg) => {
    setInspectorDate(arg.date);
    setDayViewDate(arg.date);
    setFocusedItemId(null);
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    setVisibleRange({
      start: subDays(arg.start, 7),
      end: addDays(arg.end, 14)
    });
  };

  const renderEventContent = (arg: EventContentArg) => {
    const props = arg.event.extendedProps as OverviewCalendarEvent['extendedProps'];
    return (
      <div className="min-w-0 overflow-hidden px-1.5 py-0.5 text-[11px] leading-tight">
        {props.kind === 'academic_summary' ? (
          <>
            <div className="truncate font-medium text-white/80">{props.summaryCount} mapped blocks</div>
            <div className="truncate font-semibold text-white">{arg.event.title}</div>
          </>
        ) : (
          <>
            {arg.timeText ? <div className="truncate font-medium text-white/80">{arg.timeText}</div> : null}
            <div className="truncate font-semibold text-white">{arg.event.title}</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/60">Calendar</p>
          <h1 className="text-3xl font-semibold text-white">Personal calendar</h1>
          <p className="mt-2 max-w-3xl text-white/60">
            Your school-wide events, approved group activity, timetable blocks, and meals are derived here into one calm overview, then expanded into a full day timeline when you need detail.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Upcoming" value={String(upcomingItems.length)} hint="Visible in your feed" />
          <StatCard label="Next class" value={nextAcademicItem ? formatTimeLabel(nextAcademicItem.startTime) : '—'} hint={nextAcademicItem?.title ?? 'No timetable block mapped'} />
          <StatCard label="Next meal" value={nextMealItem ? formatTimeLabel(nextMealItem.startTime) : '—'} hint={nextMealItem?.title ?? 'No meal block mapped'} />
        </div>
      </div>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-glass">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const active = activeFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveFilter(option.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-white/55">
              <span className="mr-3 uppercase tracking-[0.2em]">Group</span>
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2 text-white"
              >
                <option value="">All groups</option>
                {activeGroups.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-glass">
          {loading ? (
            <div className="p-8 text-center text-white/70">Loading your calendar…</div>
          ) : items.length === 0 ? (
            <EmptyStateCard
              eyebrow="Personal calendar"
              title="Nothing is mapped yet"
              body="This page waits for real school events, approved group membership, timetable imports, and meal datasets. It stays empty on purpose until those sources exist."
              tone="accent"
            />
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="78vh"
              events={overviewEvents}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              datesSet={handleDatesSet}
              eventContent={renderEventContent}
              dayMaxEventRows={4}
              headerToolbar={{
                start: 'title',
                center: '',
                end: 'today prev,next'
              }}
              eventDisplay="block"
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Selected day</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {format(inspectorDate, 'EEE, d MMM')}
            </h2>
            {selectedDayItems.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No mapped items for this day yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedDayItems.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFocusedItemId(item.id);
                      setDayViewDate(inspectorDate);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                        {item.allDay ? 'All day' : formatTimeLabel(item.startTime)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/55">{item.relatedGroup?.name ?? item.metadata?.blockName ?? 'Personal calendar item'}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Upcoming</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Personal queue</h2>
            {upcomingItems.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No upcoming items yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {upcomingItems.slice(0, 5).map((item) => (
                  <button
                    key={`${item.id}:upcoming`}
                    type="button"
                    onClick={() => {
                      const nextDate = new Date(item.startTime);
                      setInspectorDate(nextDate);
                      setDayViewDate(nextDate);
                      setFocusedItemId(item.id);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-white/60">{formatDateTimeRange(item.startTime, item.endTime)}</p>
                    <p className="mt-1 text-xs text-white/45">{item.relatedGroup?.name ?? item.location ?? 'Personal item'}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Readiness</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Timetable and meals</h2>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <StatusRow label="Profile mapping" value={readiness.profileReady ? 'Ready' : 'Grade and section needed'} />
              <StatusRow label="Academic datasets" value={`${readiness.academicStatus} · ${readiness.academicEntriesMatched} mapped blocks`} />
              <StatusRow label="Meal datasets" value={`${readiness.mealStatus} · ${readiness.mealEntriesMatched} mapped meals`} />
            </div>
            {!readiness.profileReady ? (
              <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white/55">
                Convergent needs grade and section on the profile before academic and meal recurrences can be derived.
              </p>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Club cadence</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Next club meeting</h2>
            {nextGroupItem ? (
              <>
                <p className="mt-4 text-sm font-medium text-white">{nextGroupItem.title}</p>
                <p className="mt-1 text-sm text-white/60">{formatDateTimeRange(nextGroupItem.startTime, nextGroupItem.endTime)}</p>
                <p className="mt-1 text-xs text-white/45">{nextGroupItem.relatedGroup?.name ?? 'Approved group event'}</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-white/60">No approved group event is scheduled for you yet.</p>
            )}
          </section>

          {managedClubs.length > 0 ? (
            <section className="rounded-3xl border border-emerald-300/20 bg-emerald-500/5 p-5 text-white shadow-glass">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-100">Managed groups</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Club workspaces</h2>
              <div className="mt-4 space-y-2">
                {managedClubs.map((club) => (
                  <Link
                    key={club.id}
                    to={`/my-clubs/${club.id}`}
                    className="block rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white transition hover:bg-white/10"
                  >
                    <div className="font-medium">{club.name}</div>
                    <div className="mt-1 text-xs text-white/55">{club.schedule}</div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {editingEvent ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EventEditor
            event={editingEvent}
            allowedCategories={editingEvent.relatedGroupId ? ['club', 'society', 'supw', 'sta', 'centre_of_excellence'] : ['school_wide', 'academic', 'meals']}
            relatedGroupId={editingEvent.relatedGroupId}
            title={editingEvent.relatedGroupId ? 'Edit group event' : 'Edit school event'}
            description="Event editing stays attached to the underlying record even though the calendar overview is fully derived."
            onSave={async (payload) => {
              await saveEvent({
                ...payload,
                scope: editingEvent.relatedGroupId ? 'group' : payload.scope,
                relatedGroupId: editingEvent.relatedGroupId ?? undefined
              });
              setEditingEvent(null);
            }}
            onCancelEdit={() => setEditingEvent(null)}
          />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Editing</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{editingEvent.title}</h2>
            <p className="mt-2 text-sm text-white/60">{formatDateTimeRange(editingEvent.startTime, editingEvent.endTime)}</p>
          </div>
        </section>
      ) : null}

      <PersonalDaySheet
        open={!!dayViewDate}
        date={dayViewDate}
        items={dayViewDate ? getItemsForDay(items, dayViewDate) : []}
        focusedItemId={focusedItemId}
        onClose={() => {
          setDayViewDate(null);
          setFocusedItemId(null);
        }}
        onEditFocusedItem={canEditFocusedEvent ? () => setEditingEvent(focusedRawEvent) : undefined}
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
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
      <span className="text-white/50">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}

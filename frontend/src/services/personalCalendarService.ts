import {
  addDays,
  compareAsc,
  endOfDay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay
} from 'date-fns';
import type { Club } from '../types/Club';
import type { EventRecord } from '../types/Event';
import type { MembershipRecord } from '../types/Membership';
import type {
  PersonalCalendarCollection,
  PersonalCalendarItem,
  PersonalCalendarItemSource
} from '../types/PersonalCalendar';
import type { ScheduleDataset, ScheduleEntry } from '../types/Schedule';
import type { AppUser } from '../types/User';

type MembershipMap = Record<string, MembershipRecord | undefined>;

type ComposePersonalCalendarInput = {
  clubs: Club[];
  events: EventRecord[];
  scheduleEntries: ScheduleEntry[];
  scheduleDatasets: ScheduleDataset[];
  membershipMap: MembershipMap;
  rangeStart: Date;
  rangeEnd: Date;
  user?: AppUser | null;
};

function isAcademicItem(event: Pick<EventRecord, 'scope' | 'category'>) {
  return event.scope === 'academic' || event.category === 'academic';
}

function normalizeKey(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

function isProfileComplete(user?: Pick<AppUser, 'grade' | 'section'> | null) {
  return !!String(user?.grade ?? '').trim() && !!String(user?.section ?? '').trim();
}

function canManageClub(
  user: { id: string; role: AppUser['role'] } | null | undefined,
  club: { managerIds?: string[] } | null | undefined
) {
  if (!user || !club) return false;
  if (user.role === 'admin') return true;
  if (!['manager', 'master'].includes(user.role)) return false;
  return (club.managerIds ?? []).includes(user.id);
}

function parseDate(value: string) {
  return parseISO(value);
}

function overlapsWindow(start: string, end: string, rangeStart: Date, rangeEnd: Date) {
  const parsedStart = parseDate(start);
  const parsedEnd = parseDate(end);
  return !isAfter(parsedStart, rangeEnd) && !isBefore(parsedEnd, rangeStart);
}

function occursOnDay(item: Pick<PersonalCalendarItem, 'startTime' | 'endTime'>, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return overlapsWindow(item.startTime, item.endTime, dayStart, dayEnd);
}

function toOccurrenceIso(date: Date, time: string) {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw ?? '0');
  const minutes = Number(minutesRaw ?? '0');
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number.isNaN(hours) ? 0 : hours,
    Number.isNaN(minutes) ? 0 : minutes
  ).toISOString();
}

function matchesProfile(user: AppUser | null | undefined, entry: ScheduleEntry) {
  const gradeMatches = !entry.grade || normalizeKey(entry.grade) === normalizeKey(user?.grade);
  const sectionMatches = !entry.section || normalizeKey(entry.section) === normalizeKey(user?.section);
  return gradeMatches && sectionMatches;
}

function matchesAcademicAudience(user: AppUser | null | undefined, event: EventRecord) {
  if (!isAcademicItem(event)) return true;
  const gradeMatches = !event.audienceGrade || normalizeKey(event.audienceGrade) === normalizeKey(user?.grade);
  const sectionMatches = !event.audienceSection || normalizeKey(event.audienceSection) === normalizeKey(user?.section);
  return gradeMatches && sectionMatches;
}

function isApprovedGroupEvent(
  user: AppUser | null | undefined,
  membershipMap: MembershipMap,
  clubMap: Record<string, Club>,
  event: EventRecord
) {
  const groupId = event.relatedGroupId ?? event.clubId;
  if (!groupId) return false;
  const club = clubMap[groupId];
  if (canManageClub(user, club)) return true;
  const membership = membershipMap[groupId];
  return membership?.status === 'approved' || (user?.clubsJoined ?? []).includes(groupId);
}

function getEventSource(event: EventRecord): PersonalCalendarItemSource {
  if (event.scope === 'academic' || event.category === 'academic') return 'academic_schedule';
  return event.relatedGroupId || event.clubId ? 'group_event' : 'school_event';
}

function toPersonalEventItem(
  event: EventRecord,
  clubMap: Record<string, Club>,
  allowPrivateLinks: boolean
): PersonalCalendarItem {
  const relatedGroupId = event.relatedGroupId ?? event.clubId;
  const relatedClub = relatedGroupId ? clubMap[relatedGroupId] : undefined;
  const privateLinksHidden = !allowPrivateLinks && event.visibility !== 'school' && !!(event.classroomLink || event.meetLink || event.resourceLinks.length > 0);

  return {
    id: `event:${event.id}`,
    sourceId: event.id,
    sourceType: 'event',
    source: getEventSource(event),
    title: event.title,
    description: event.description,
    category: event.category,
    scope: event.scope,
    startTime: event.startTime,
    endTime: event.endTime,
    allDay: !!event.allDay,
    location: event.location,
    classroomLink: privateLinksHidden ? null : event.classroomLink ?? null,
    classroomCourseId: privateLinksHidden ? null : event.classroomCourseId ?? null,
    classroomPostLink: privateLinksHidden ? null : event.classroomPostLink ?? null,
    meetLink: privateLinksHidden ? null : event.meetLink ?? null,
    resourceLinks: privateLinksHidden ? [] : event.resourceLinks,
    hiddenPrivateLinks: privateLinksHidden,
    visibility: event.visibility,
    relatedGroup: relatedClub
      ? {
          id: relatedClub.id,
          name: relatedClub.name,
          category: relatedClub.category
        }
      : undefined,
    author: {
      uid: event.createdByUid,
      name: event.createdByNameSnapshot,
      email: event.createdByEmailSnapshot,
      role: event.createdByRoleSnapshot
    },
    metadata: {
      sourceDataset: event.sourceMetadata?.sourceDataset,
      visibilityReason: privateLinksHidden ? 'Links become readable only after membership approval.' : undefined
    }
  };
}

function getDatasetStatus(datasets: ScheduleDataset[], scheduleType: ScheduleDataset['scheduleType']) {
  const matching = datasets.filter((dataset) => dataset.scheduleType === scheduleType);
  if (matching.some((dataset) => dataset.status === 'ready')) return 'ready' as const;
  if (matching.some((dataset) => dataset.status === 'placeholder')) return 'placeholder' as const;
  return 'missing' as const;
}

function expandScheduleEntries(
  entries: ScheduleEntry[],
  rangeStart: Date,
  rangeEnd: Date,
  user: AppUser | null | undefined
) {
  const personalisedEntries = entries.filter((entry) => matchesProfile(user, entry));
  const results: PersonalCalendarItem[] = [];
  const windowStart = startOfDay(rangeStart);
  const windowEnd = endOfDay(rangeEnd);

  personalisedEntries.forEach((entry) => {
    for (let cursor = windowStart; !isAfter(cursor, windowEnd); cursor = addDays(cursor, 1)) {
      const day = cursor.getDay();
      const normalizedDay = entry.dayOfWeek === 7 ? 0 : entry.dayOfWeek;
      if (day !== normalizedDay) continue;
      const startTime = toOccurrenceIso(cursor, entry.startTime);
      const endTime = toOccurrenceIso(cursor, entry.endTime);
      results.push({
        id: `schedule:${entry.id}:${cursor.toISOString().slice(0, 10)}`,
        sourceId: entry.id,
        sourceType: 'schedule',
        source: entry.scheduleType === 'meal' ? 'meal_schedule' : 'academic_schedule',
        title: entry.title,
        category: entry.category,
        scope: 'academic',
        scheduleType: entry.scheduleType,
        startTime,
        endTime,
        allDay: false,
        location: entry.location,
        classroomLink: null,
        classroomCourseId: null,
        classroomPostLink: null,
        meetLink: null,
        resourceLinks: entry.resourceLinks,
        hiddenPrivateLinks: false,
        visibility: 'school',
        metadata: {
          blockName: entry.blockName,
          teacher: entry.teacher,
          sourceDataset: entry.sourceDataset
        }
      });
    }
  });

  return {
    items: results,
    academicEntriesMatched: personalisedEntries.filter((entry) => entry.scheduleType === 'academic').length,
    mealEntriesMatched: personalisedEntries.filter((entry) => entry.scheduleType === 'meal').length
  };
}

function sortPersonalItems(items: PersonalCalendarItem[]) {
  return [...items].sort((left, right) => {
    const startCompare = compareAsc(parseDate(left.startTime), parseDate(right.startTime));
    if (startCompare !== 0) return startCompare;
    return compareAsc(parseDate(left.endTime), parseDate(right.endTime));
  });
}

function findNextItem(items: PersonalCalendarItem[], predicate: (item: PersonalCalendarItem) => boolean) {
  const now = new Date();
  return items.find((item) => !isBefore(parseDate(item.endTime), now) && predicate(item)) ?? null;
}

export function composePersonalCalendar({
  clubs,
  events,
  scheduleEntries,
  scheduleDatasets,
  membershipMap,
  rangeStart,
  rangeEnd,
  user
}: ComposePersonalCalendarInput): PersonalCalendarCollection {
  const clubMap = clubs.reduce<Record<string, Club>>((acc, club) => {
    acc[club.id] = club;
    return acc;
  }, {});

  const visibleEvents = events.filter((event) => {
    if (!overlapsWindow(event.startTime, event.endTime, rangeStart, rangeEnd)) return false;
    if (isAcademicItem(event)) return matchesAcademicAudience(user, event);
    if (event.relatedGroupId || event.clubId) return isApprovedGroupEvent(user, membershipMap, clubMap, event);
    return true;
  });

  const eventItems = visibleEvents.map((event) =>
    toPersonalEventItem(
      event,
      clubMap,
      !(event.relatedGroupId || event.clubId) || isApprovedGroupEvent(user, membershipMap, clubMap, event)
    )
  );

  const scheduleExpansion = expandScheduleEntries(scheduleEntries, rangeStart, rangeEnd, user);
  const items = sortPersonalItems([...eventItems, ...scheduleExpansion.items]);
  const now = new Date();
  const upcomingItems = items.filter((item) => !isBefore(parseDate(item.endTime), now)).slice(0, 12);

  return {
    items,
    upcomingItems,
    nextAcademicItem: findNextItem(items, (item) => item.source === 'academic_schedule'),
    nextMealItem: findNextItem(items, (item) => item.source === 'meal_schedule'),
    nextGroupItem: findNextItem(items, (item) => item.source === 'group_event'),
    nextSchoolWideItem: findNextItem(items, (item) => item.source === 'school_event'),
    readiness: {
      academicStatus: getDatasetStatus(scheduleDatasets, 'academic'),
      mealStatus: getDatasetStatus(scheduleDatasets, 'meal'),
      academicEntriesMatched: scheduleExpansion.academicEntriesMatched,
      mealEntriesMatched: scheduleExpansion.mealEntriesMatched,
      profileReady: isProfileComplete(user)
    }
  };
}

export function getItemsForDay(items: PersonalCalendarItem[], day: Date) {
  return items.filter((item) => occursOnDay(item, day));
}

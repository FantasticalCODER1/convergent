import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import type { EventRecord, EventScope } from '../types/Event';
import type { AppUser } from '../types/User';
import { callFunction } from '../firebase/functions';
import { firestore } from '../firebase/firestore';
import { mapEventData, normalizeString } from './recordMappers';

const rsvpsRef = collection(firestore, 'eventRsvps');

function mapEvent(snapshot: any): EventRecord {
  return mapEventData(snapshot.id, snapshot.data());
}

function toTimestamp(value: string | Date) {
  if (value instanceof Date) return Timestamp.fromDate(value);
  return Timestamp.fromDate(new Date(value));
}

export type EventInput = {
  id?: string;
  title: string;
  description?: string;
  category: EventRecord['category'];
  scope: EventScope;
  relatedGroupId?: string;
  audienceGrade?: string;
  audienceSection?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  classroomLink?: string;
  classroomCourseId?: string;
  classroomPostLink?: string;
  meetLink?: string;
  resourceLinks?: EventRecord['resourceLinks'];
  attendanceEnabled?: boolean;
  visibility?: EventRecord['visibility'];
  sourceMetadata?: EventRecord['sourceMetadata'];
};

export type EventListOptions = {
  rangeStart?: string | Date;
  rangeEnd?: string | Date;
};

function toIsoString(value?: string | Date) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export async function listEvents(options: EventListOptions = {}): Promise<EventRecord[]> {
  return callFunction<{ rangeStart?: string; rangeEnd?: string }, EventRecord[]>('listVisibleEvents', {
    rangeStart: toIsoString(options.rangeStart),
    rangeEnd: toIsoString(options.rangeEnd)
  });
}

function buildLegacyEventType(input: EventInput) {
  if (input.scope === 'school') return 'school';
  return 'club';
}

export async function saveEvent(input: EventInput, author?: AppUser) {
  const relatedGroupId = normalizeString(input.relatedGroupId);
  const payload = {
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    scope: input.scope,
    relatedGroupId: relatedGroupId ?? null,
    audienceGrade: input.audienceGrade ?? null,
    audienceSection: input.audienceSection ?? null,
    clubId: relatedGroupId ?? null,
    startTime: toTimestamp(input.startTime),
    endTime: toTimestamp(input.endTime),
    allDay: !!input.allDay,
    location: input.location ?? null,
    classroomLink: input.classroomLink ?? null,
    classroomCourseId: input.classroomCourseId ?? null,
    classroomPostLink: input.classroomPostLink ?? null,
    meetLink: input.meetLink ?? null,
    resourceLinks: input.resourceLinks ?? [],
    attendanceEnabled: input.attendanceEnabled ?? true,
    visibility: input.visibility ?? (relatedGroupId ? 'members' : 'school'),
    type: buildLegacyEventType(input),
    sourceMetadata: {
      source: input.sourceMetadata?.source ?? 'manual',
      sourceId: input.sourceMetadata?.sourceId ?? null,
      sourceDataset: input.sourceMetadata?.sourceDataset ?? null,
      sourceTerm: input.sourceMetadata?.sourceTerm ?? null,
      sourceHash: input.sourceMetadata?.sourceHash ?? null
    },
    source: input.sourceMetadata?.source ?? 'manual',
    sourceId: input.sourceMetadata?.sourceId ?? null,
    sourceDataset: input.sourceMetadata?.sourceDataset ?? null,
    sourceTerm: input.sourceMetadata?.sourceTerm ?? null,
    sourceHash: input.sourceMetadata?.sourceHash ?? null,
    updatedAt: serverTimestamp()
  };
  if (input.id) {
    const eventRef = doc(firestore, 'events', input.id);
    await updateDoc(eventRef, payload);
    const snap = await getDoc(eventRef);
    return mapEvent(snap);
  }

  const docRef = await addDoc(collection(firestore, 'events'), {
    ...payload,
    rsvpCount: 0,
    createdByUid: author?.id ?? null,
    createdByNameSnapshot: author?.name ?? null,
    createdByEmailSnapshot: author?.email ?? null,
    createdByRoleSnapshot: author?.role ?? null,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(docRef);
  return mapEvent(snap);
}

export type ImportedEventPayload = Omit<EventInput, 'id'> & { sourceId: string };
export type EventImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ index: number; sourceId: string | null; message: string }>;
};

export type EventAttendanceRecord = {
  userId: string;
  name: string;
  email: string;
  role: string;
  respondedAt?: string;
};

export async function upsertImportedEvents(clubId: string, events: ImportedEventPayload[]) {
  return callFunction<{ clubId: string; events: ImportedEventPayload[] }, EventImportResult>('applyEventImport', {
    clubId,
    events: events.map((event) => ({
      ...event,
      relatedGroupId: event.relatedGroupId ?? clubId,
      sourceMetadata: {
        ...event.sourceMetadata,
        source: event.sourceMetadata?.source ?? 'admin-importer',
        sourceId: event.sourceId
      }
    }))
  });
}

export async function rsvpToEvent(eventId: string, _user: AppUser, attending: boolean) {
  await callFunction<{ eventId: string; attending: boolean }, { ok: true; attending: boolean }>('setEventRsvp', {
    eventId,
    attending
  });
}

export async function listEventAttendance(eventId: string) {
  return callFunction<{ eventId: string }, EventAttendanceRecord[]>('listEventAttendance', { eventId });
}

export async function listRsvpsForUser(userId: string) {
  const q = query(rsvpsRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  const records: Record<string, boolean> = {};
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    records[data.eventId] = !!data.attending;
  });
  return records;
}

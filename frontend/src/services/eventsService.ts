import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { callFunction } from '../firebase/functions';
import { normalizeCategory } from '../domain/categories';
import type { EventRecord, EventScope } from '../types/Event';
import type { AppUser } from '../types/User';
import { firestore } from '../firebase/firestore';

const eventsRef = collection(firestore, 'events');
const rsvpsRef = collection(firestore, 'eventRsvps');

function mapEvent(snapshot: any): EventRecord {
  const data = snapshot.data();
  const startTime = toIso(data.startTime) ?? toIso(data.createdAt) ?? new Date(0).toISOString();
  const endTime = toIso(data.endTime) ?? startTime;
  const relatedGroupId = normalizeString(data.relatedGroupId) ?? normalizeString(data.clubId);
  const scope = (normalizeString(data.scope) as EventScope | undefined) ?? (relatedGroupId ? 'group' : 'school');
  return {
    id: snapshot.id,
    title: data.title ?? 'Untitled event',
    description: data.description,
    category: normalizeCategory(data.category, relatedGroupId ? 'club' : 'school_wide'),
    scope,
    relatedGroupId,
    startTime,
    endTime,
    allDay: !!data.allDay,
    location: data.location,
    classroomLink: normalizeString(data.classroomLink) ?? null,
    classroomCourseId: normalizeString(data.classroomCourseId) ?? null,
    meetLink: normalizeString(data.meetLink) ?? null,
    resourceLinks: mapResourceLinks(data.resourceLinks),
    attendanceEnabled: data.attendanceEnabled !== false,
    createdByUid: normalizeString(data.createdByUid),
    createdByNameSnapshot: normalizeString(data.createdByNameSnapshot),
    createdByEmailSnapshot: normalizeString(data.createdByEmailSnapshot),
    createdByRoleSnapshot: normalizeString(data.createdByRoleSnapshot),
    visibility: (normalizeString(data.visibility) as EventRecord['visibility']) ?? 'school',
    sourceMetadata: {
      source: normalizeString(data.sourceMetadata?.source) ?? normalizeString(data.source),
      sourceId: normalizeString(data.sourceMetadata?.sourceId) ?? normalizeString(data.sourceId),
      sourceDataset: normalizeString(data.sourceMetadata?.sourceDataset) ?? normalizeString(data.sourceDataset),
      sourceTerm: normalizeString(data.sourceMetadata?.sourceTerm) ?? normalizeString(data.sourceTerm),
      sourceHash: normalizeString(data.sourceMetadata?.sourceHash) ?? normalizeString(data.sourceHash)
    },
    clubId: relatedGroupId,
    rsvpCount: data.rsvpCount ?? 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function toIso(value?: Timestamp | null | string) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}

function toTimestamp(value: string | Date) {
  if (value instanceof Date) return Timestamp.fromDate(value);
  return Timestamp.fromDate(new Date(value));
}

function normalizeString(value?: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function mapResourceLinks(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const label = normalizeString((entry as { label?: unknown }).label);
      const url = normalizeString((entry as { url?: unknown }).url);
      const kind = normalizeString((entry as { kind?: unknown }).kind);
      if (!label || !url) return null;
      return { label, url, kind: kind as 'resource' | 'classroom' | 'meet' | 'reference' | undefined };
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);
}

export type EventInput = {
  id?: string;
  title: string;
  description?: string;
  category: EventRecord['category'];
  scope: EventScope;
  relatedGroupId?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  classroomLink?: string;
  classroomCourseId?: string;
  meetLink?: string;
  resourceLinks?: EventRecord['resourceLinks'];
  attendanceEnabled?: boolean;
  visibility?: EventRecord['visibility'];
  sourceMetadata?: EventRecord['sourceMetadata'];
};

export async function listEvents(): Promise<EventRecord[]> {
  const q = query(eventsRef, orderBy('startTime'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapEvent(docSnap));
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
    category: normalizeCategory(input.category),
    scope: input.scope,
    relatedGroupId: relatedGroupId ?? null,
    clubId: relatedGroupId ?? null,
    startTime: toTimestamp(input.startTime),
    endTime: toTimestamp(input.endTime),
    allDay: !!input.allDay,
    location: input.location ?? null,
    classroomLink: input.classroomLink ?? null,
    classroomCourseId: input.classroomCourseId ?? null,
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
    const eventRef = doc(eventsRef, input.id);
    await updateDoc(eventRef, payload);
    const snap = await getDoc(eventRef);
    return mapEvent(snap);
  }

  const docRef = await addDoc(eventsRef, {
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

export async function rsvpToEvent(eventId: string, user: AppUser, attending: boolean) {
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

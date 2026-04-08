import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { callFunction } from '../firebase/functions';
import type { EventKind, EventRecord } from '../types/Event';
import type { AppUser } from '../types/User';
import { firestore } from '../firebase/firestore';

const eventsRef = collection(firestore, 'events');
const rsvpsRef = collection(firestore, 'eventRsvps');

function mapEvent(snapshot: any): EventRecord {
  const data = snapshot.data();
  const startTime = toIso(data.startTime) ?? toIso(data.createdAt) ?? new Date(0).toISOString();
  const endTime = toIso(data.endTime) ?? startTime;
  return {
    id: snapshot.id,
    title: data.title ?? 'Untitled event',
    description: data.description,
    startTime,
    endTime,
    location: data.location,
    type: (data.type ?? 'club') as EventKind,
    clubId: data.clubId,
    source: data.source,
    sourceId: data.sourceId,
    rsvpCount: data.rsvpCount ?? 0,
    updatedAt: toIso(data.updatedAt)
  };
}

function toIso(value?: Timestamp | null) {
  if (!value) return undefined;
  return value.toDate().toISOString();
}

function toTimestamp(value: string | Date) {
  if (value instanceof Date) return Timestamp.fromDate(value);
  return Timestamp.fromDate(new Date(value));
}

export type EventInput = {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: EventKind;
  clubId?: string;
  source?: string;
  sourceId?: string;
};

export async function listEvents(): Promise<EventRecord[]> {
  const q = query(eventsRef, orderBy('startTime'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapEvent(docSnap));
}

export async function saveEvent(input: EventInput) {
  if (input.id) {
    const eventRef = doc(eventsRef, input.id);
    await updateDoc(eventRef, {
      title: input.title,
      description: input.description ?? null,
      startTime: toTimestamp(input.startTime),
      endTime: toTimestamp(input.endTime),
      location: input.location ?? null,
      type: input.type,
      clubId: input.clubId ?? null,
      source: input.source ?? null,
      sourceId: input.sourceId ?? null,
      updatedAt: serverTimestamp()
    });
    const snap = await getDoc(eventRef);
    return mapEvent(snap);
  }

  const docRef = await addDoc(eventsRef, {
    title: input.title,
    description: input.description ?? null,
    startTime: toTimestamp(input.startTime),
    endTime: toTimestamp(input.endTime),
    location: input.location ?? null,
    type: input.type,
    clubId: input.clubId ?? null,
    source: input.source ?? 'manual',
    sourceId: input.sourceId ?? null,
    rsvpCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  const snap = await getDoc(docRef);
  return mapEvent(snap);
}

async function findEventBySourceId(sourceId: string) {
  const q = query(eventsRef, where('sourceId', '==', sourceId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, data: snap.docs[0].data() };
}

export type ImportedEventPayload = Omit<EventInput, 'id'> & { sourceId: string };
export type EventImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ index: number; sourceId: string | null; message: string }>;
};

export async function upsertImportedEvents(clubId: string, events: ImportedEventPayload[]) {
  return callFunction<{ clubId: string; events: ImportedEventPayload[] }, EventImportResult>('applyEventImport', {
    clubId,
    events: events.map((event) => ({
      ...event,
      clubId,
      source: event.source ?? 'admin-importer'
    }))
  });
}

export async function rsvpToEvent(eventId: string, user: AppUser, attending: boolean) {
  await callFunction<{ eventId: string; attending: boolean }, { ok: true; attending: boolean }>('setEventRsvp', {
    eventId,
    attending
  });
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

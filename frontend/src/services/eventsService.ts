import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import type { EventKind, EventRecord } from '../types/Event';
import type { AppUser } from '../types/User';
import { firestore } from '../firebase/firestore';

const eventsRef = collection(firestore, 'events');
const rsvpsRef = collection(firestore, 'eventRsvps');

function mapEvent(snapshot: any): EventRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? 'Untitled event',
    description: data.description,
    startTime: toIso(data.startTime),
    endTime: toIso(data.endTime),
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

export async function upsertImportedEvents(events: ImportedEventPayload[]) {
  for (const payload of events) {
    if (!payload.sourceId) continue;
    const existing = await findEventBySourceId(payload.sourceId);
    if (existing) {
      await updateDoc(doc(eventsRef, existing.id), {
        title: payload.title,
        description: payload.description ?? null,
        startTime: toTimestamp(payload.startTime),
        endTime: toTimestamp(payload.endTime),
        location: payload.location ?? null,
        type: payload.type,
        clubId: payload.clubId ?? null,
        source: payload.source ?? 'importer',
        updatedAt: serverTimestamp()
      });
    } else {
      await saveEvent({ ...payload, source: payload.source ?? 'importer' });
    }
  }
}

export async function rsvpToEvent(eventId: string, user: AppUser, attending: boolean) {
  const rsvpDoc = doc(rsvpsRef, `${eventId}_${user.id}`);
  const existing = await getDoc(rsvpDoc);
  const eventDoc = doc(eventsRef, eventId);

  if (attending) {
    await setDoc(
      rsvpDoc,
      {
        eventId,
        userId: user.id,
        attending: true,
        respondedAt: serverTimestamp()
      },
      { merge: true }
    );
    if (!existing.exists()) {
      await updateDoc(eventDoc, { rsvpCount: increment(1) });
    }
    return;
  }

  if (existing.exists()) {
    await deleteDoc(rsvpDoc);
    const data = existing.data();
    if (data?.attending) {
      await updateDoc(eventDoc, { rsvpCount: increment(-1) });
    }
  }
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

import {
  Timestamp,
  collection,
  getDocs,
  orderBy,
  query
} from 'firebase/firestore';
import { normalizeCategory } from '../domain/categories';
import type { ScheduleDataset, ScheduleEntry } from '../types/Schedule';
import { firestore } from '../firebase/firestore';
import { mapResourceLinks, normalizeString } from './recordMappers';

const scheduleEntriesRef = collection(firestore, 'scheduleEntries');
const scheduleDatasetsRef = collection(firestore, 'scheduleDatasets');

function toIso(value?: Timestamp | null | string) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}

function mapScheduleEntry(snapshot: any): ScheduleEntry {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    scheduleType: data.scheduleType === 'meal' ? 'meal' : 'academic',
    category: normalizeCategory(data.category, data.scheduleType === 'meal' ? 'meals' : 'academic'),
    grade: normalizeString(data.grade),
    section: normalizeString(data.section),
    dayOfWeek: Number(data.dayOfWeek ?? 1),
    blockName: normalizeString(data.blockName) ?? 'Block',
    title: normalizeString(data.title) ?? normalizeString(data.subject) ?? 'Untitled entry',
    teacher: normalizeString(data.teacher),
    location: normalizeString(data.location),
    startTime: normalizeString(data.startTime) ?? '00:00',
    endTime: normalizeString(data.endTime) ?? '00:00',
    resourceLinks: mapResourceLinks(data.resourceLinks),
    sourceDataset: normalizeString(data.sourceDataset),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapScheduleDataset(snapshot: any): ScheduleDataset {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    scheduleType: data.scheduleType === 'meal' ? 'meal' : 'academic',
    title: normalizeString(data.title) ?? 'Unnamed dataset',
    audienceLabel: normalizeString(data.audienceLabel),
    status: data.status === 'ready' ? 'ready' : data.status === 'missing' ? 'missing' : 'placeholder',
    sourceDataset: normalizeString(data.sourceDataset),
    notes: normalizeString(data.notes),
    updatedAt: toIso(data.updatedAt)
  };
}

export async function listScheduleEntries() {
  const q = query(scheduleEntriesRef, orderBy('dayOfWeek'), orderBy('startTime'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapScheduleEntry(docSnap));
}

export async function listScheduleDatasets() {
  const q = query(scheduleDatasetsRef, orderBy('title'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapScheduleDataset(docSnap));
}

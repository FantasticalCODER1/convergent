import {
  Timestamp,
  collection,
  getDocs
} from 'firebase/firestore';
import { callFunction } from '../firebase/functions';
import { firestore } from '../firebase/firestore';
import type {
  ChangeLogRecord,
  InboundMessageRecord,
  ParsedAnnouncementRecord,
  ProposedCalendarChangeRecord,
  ProposedChangeStatus
} from '../types/Review';

const inboundMessagesRef = collection(firestore, 'inboundMessages');
const parsedAnnouncementsRef = collection(firestore, 'parsedAnnouncements');
const proposedCalendarChangesRef = collection(firestore, 'proposedCalendarChanges');
const changeLogsRef = collection(firestore, 'changeLogs');

function toIso(value?: Timestamp | null | string) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}

function normalizeString(value?: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeStringArray(value?: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim());
}

function normalizeObject(value?: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapProposal(snapshot: any): ProposedCalendarChangeRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    sourceMessageId: normalizeString(data.sourceMessageId) ?? '',
    sender: normalizeString(data.sender) ?? 'Unknown sender',
    subject: normalizeString(data.subject) ?? 'Untitled message',
    receivedAt: toIso(data.receivedAt) ?? toIso(data.createdAt),
    parsedType: normalizeString(data.parsedType) ?? 'unknown',
    affectedEventIds: normalizeStringArray(data.affectedEventIds),
    oldValues: normalizeObject(data.oldValues),
    proposedValues: normalizeObject(data.proposedValues),
    confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
    status: (normalizeString(data.status) as ProposedChangeStatus | undefined) ?? 'pending_review',
    reviewedBy: normalizeString(data.reviewedBy),
    reviewedAt: toIso(data.reviewedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapInboundMessage(snapshot: any): InboundMessageRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    sender: normalizeString(data.sender) ?? 'Unknown sender',
    subject: normalizeString(data.subject) ?? 'Untitled message',
    receivedAt: toIso(data.receivedAt),
    rawText: normalizeString(data.rawText),
    htmlUrl: normalizeString(data.htmlUrl) ?? null,
    parsedAnnouncementIds: normalizeStringArray(data.parsedAnnouncementIds),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapParsedAnnouncement(snapshot: any): ParsedAnnouncementRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    sourceMessageId: normalizeString(data.sourceMessageId) ?? '',
    sender: normalizeString(data.sender) ?? 'Unknown sender',
    subject: normalizeString(data.subject) ?? 'Untitled message',
    receivedAt: toIso(data.receivedAt),
    parsedType: normalizeString(data.parsedType) ?? 'unknown',
    summary: normalizeString(data.summary),
    confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
    affectedEventIds: normalizeStringArray(data.affectedEventIds),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapChangeLog(snapshot: any): ChangeLogRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    proposalId: normalizeString(data.proposalId) ?? '',
    sourceMessageId: normalizeString(data.sourceMessageId),
    decision: (normalizeString(data.decision) as ChangeLogRecord['decision']) ?? 'approved',
    sender: normalizeString(data.sender) ?? 'Unknown sender',
    subject: normalizeString(data.subject) ?? 'Untitled message',
    affectedEventIds: normalizeStringArray(data.affectedEventIds),
    oldValues: normalizeObject(data.oldValues),
    proposedValues: normalizeObject(data.proposedValues),
    reviewedBy: normalizeString(data.reviewedBy) ?? '',
    reviewedAt: toIso(data.reviewedAt),
    createdAt: toIso(data.createdAt)
  };
}

export async function listInboundMessages() {
  const snap = await getDocs(inboundMessagesRef);
  return snap.docs.map((docSnap) => mapInboundMessage(docSnap)).sort((left, right) => String(right.receivedAt ?? '').localeCompare(String(left.receivedAt ?? '')));
}

export async function listParsedAnnouncements() {
  const snap = await getDocs(parsedAnnouncementsRef);
  return snap.docs.map((docSnap) => mapParsedAnnouncement(docSnap)).sort((left, right) => String(right.receivedAt ?? '').localeCompare(String(left.receivedAt ?? '')));
}

export async function listProposedCalendarChanges() {
  const snap = await getDocs(proposedCalendarChangesRef);
  return snap.docs.map((docSnap) => mapProposal(docSnap)).sort((left, right) => String(right.receivedAt ?? '').localeCompare(String(left.receivedAt ?? '')));
}

export async function listChangeLogs() {
  const snap = await getDocs(changeLogsRef);
  return snap.docs.map((docSnap) => mapChangeLog(docSnap)).sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')));
}

export async function reviewProposedCalendarChange(proposalId: string, decision: Exclude<ProposedChangeStatus, 'pending_review'>) {
  return callFunction<{ proposalId: string; decision: 'approved' | 'rejected' }, { ok: true; status: 'approved' | 'rejected' }>(
    'reviewProposedCalendarChange',
    { proposalId, decision }
  );
}

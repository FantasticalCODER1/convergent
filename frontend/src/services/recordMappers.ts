import type { Club } from '../types/Club';
import type { EventRecord, EventScope } from '../types/Event';
import type { MembershipRecord } from '../types/Membership';
import type { PostRecord } from '../types/Post';
import type { ResourceLink, VisibilityScope } from '../types/Shared';
import type { ConvergentCategoryKey } from '../domain/categories';

type TimestampLike = {
  toDate?: () => Date;
};

type FirestoreRecord = Record<string, unknown>;

const VISIBILITY_SCOPES = new Set<VisibilityScope>(['school', 'members', 'managers', 'private']);
const EVENT_SCOPES = new Set<EventScope>(['school', 'group', 'academic']);
const CATEGORY_KEYS = new Set([
  'school_wide',
  'academic',
  'club',
  'society',
  'supw',
  'sta',
  'centre_of_excellence',
  'meals'
]);

export function normalizeString(value?: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeCategory(value?: string | null, fallback: ConvergentCategoryKey = 'club'): ConvergentCategoryKey {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/gu, '_');
  if (CATEGORY_KEYS.has(normalized)) return normalized as ConvergentCategoryKey;
  if (normalized === 'school' || normalized === 'schoolwide') return 'school_wide';
  if (normalized === 'coe') return 'centre_of_excellence';
  return fallback;
}

export function toIsoValue(value?: TimestampLike | null | string) {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || undefined;
  }
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return undefined;
}

function deriveResourceLabel(url: string, index: number) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./u, '') || `Resource ${index + 1}`;
  } catch {
    return `Resource ${index + 1}`;
  }
}

export function mapResourceLinks(input: unknown): ResourceLink[] {
  if (!Array.isArray(input)) return [];
  const links = input
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const url = normalizeString(entry);
        if (!url) return null;
        return { label: deriveResourceLabel(url, index), url, kind: 'resource' as const };
      }
      if (!entry || typeof entry !== 'object') return null;
      const label = normalizeString((entry as { label?: unknown }).label);
      const url = normalizeString((entry as { url?: unknown }).url);
      const kind = normalizeString((entry as { kind?: unknown }).kind);
      if (!url) return null;
      return {
        label: label ?? deriveResourceLabel(url, index),
        url,
        kind: kind as ResourceLink['kind']
      };
    })
    .filter(Boolean);
  return links as ResourceLink[];
}

function inferGroupId(data: FirestoreRecord) {
  return normalizeString(data.relatedGroupId) ?? normalizeString(data.clubId);
}

function inferLegacyEventType(data: FirestoreRecord) {
  return normalizeString(data.type)?.toLowerCase();
}

function hasPrivateLinks(data: FirestoreRecord) {
  return !!(
    normalizeString(data.classroomLink) ||
    normalizeString(data.classroomPostLink) ||
    normalizeString(data.meetLink) ||
    (Array.isArray(data.resourceLinks) && data.resourceLinks.length > 0)
  );
}

function inferEventScope(data: FirestoreRecord, relatedGroupId?: string): EventScope {
  const explicit = normalizeString(data.scope) as EventScope | undefined;
  if (explicit && EVENT_SCOPES.has(explicit)) return explicit;
  const legacyType = inferLegacyEventType(data);
  if (legacyType === 'academic' || normalizeCategory(normalizeString(data.category), 'club') === 'academic') return 'academic';
  if (relatedGroupId || legacyType === 'club') return 'group';
  return 'school';
}

function inferEventVisibility(data: FirestoreRecord, scope: EventScope, relatedGroupId?: string): VisibilityScope {
  const explicit = normalizeString(data.visibility) as VisibilityScope | undefined;
  if (explicit && VISIBILITY_SCOPES.has(explicit)) return explicit;
  if (scope === 'academic' || !relatedGroupId) return 'school';
  return hasPrivateLinks(data) ? 'members' : 'members';
}

function inferEventCategory(data: FirestoreRecord, scope: EventScope, relatedGroupId?: string) {
  const legacyType = inferLegacyEventType(data);
  const fallback =
    scope === 'academic'
      ? 'academic'
      : relatedGroupId || legacyType === 'club'
        ? 'club'
        : 'school_wide';
  return normalizeCategory(normalizeString(data.category), fallback);
}

export function mapClubData(id: string, data: FirestoreRecord): Club {
  const defaultMeetLink = normalizeString(data.defaultMeetLink) ?? normalizeString(data.meetLink) ?? null;
  return {
    id,
    name: normalizeString(data.name) ?? 'Unnamed club',
    description: normalizeString(data.description) ?? '',
    category: normalizeCategory(normalizeString(data.category)),
    groupType: (normalizeString(data.groupType) as Club['groupType']) ?? 'club',
    mic: normalizeString(data.mic) ?? 'N/A',
    schedule: normalizeString(data.schedule) ?? 'TBD',
    meetingLocation: normalizeString(data.meetingLocation),
    logoUrl: normalizeString(data.logoUrl),
    classroomLink: normalizeString(data.classroomLink) ?? null,
    classroomCode: normalizeString(data.classroomCode) ?? null,
    classroomCourseId: normalizeString(data.classroomCourseId) ?? null,
    defaultMeetLink,
    meetLink: defaultMeetLink,
    resourceLinks: mapResourceLinks(data.resourceLinks),
    membershipMode: (normalizeString(data.membershipMode) as Club['membershipMode']) ?? 'open',
    visibility: (normalizeString(data.visibility) as Club['visibility']) ?? 'school',
    managerIds: Array.isArray(data.managerIds) ? data.managerIds.filter((entry): entry is string => typeof entry === 'string') : [],
    memberCount: typeof data.memberCount === 'number' ? data.memberCount : 0,
    createdAt: toIsoValue(data.createdAt as TimestampLike | string | null | undefined),
    updatedAt: toIsoValue(data.updatedAt as TimestampLike | string | null | undefined)
  };
}

export function mapPostData(id: string, data: FirestoreRecord, fallbackGroupId?: string): PostRecord {
  return {
    id,
    title: normalizeString(data.title) ?? 'Update',
    content: normalizeString(data.content) ?? normalizeString(data.text) ?? '',
    category: normalizeCategory(normalizeString(data.category), 'club'),
    relatedGroupId: normalizeString(data.relatedGroupId) ?? normalizeString(data.clubId) ?? fallbackGroupId ?? null,
    linkedEventId: normalizeString(data.linkedEventId) ?? null,
    classroomLink: normalizeString(data.classroomLink) ?? null,
    meetLink: normalizeString(data.meetLink) ?? null,
    resourceLinks: mapResourceLinks(data.resourceLinks),
    postedByUid: normalizeString(data.postedByUid) ?? normalizeString(data.authorId) ?? 'unknown',
    postedByNameSnapshot:
      normalizeString(data.postedByNameSnapshot) ??
      normalizeString(data.authorName) ??
      normalizeString(data.createdByNameSnapshot) ??
      'Unknown author',
    postedByEmailSnapshot:
      normalizeString(data.postedByEmailSnapshot) ??
      normalizeString(data.authorEmail) ??
      normalizeString(data.createdByEmailSnapshot) ??
      '',
    postedByRoleSnapshot:
      normalizeString(data.postedByRoleSnapshot) ??
      normalizeString(data.authorRole) ??
      normalizeString(data.createdByRoleSnapshot) ??
      'student',
    visibility: (normalizeString(data.visibility) as PostRecord['visibility']) ?? 'members',
    createdAt: toIsoValue(data.createdAt as TimestampLike | string | null | undefined),
    updatedAt: toIsoValue(data.updatedAt as TimestampLike | string | null | undefined)
  };
}

export function mapMembershipData(id: string, data: FirestoreRecord, parentGroupId?: string): MembershipRecord {
  const groupId = normalizeString(data.groupId) ?? normalizeString(data.clubId) ?? parentGroupId ?? '';
  return {
    id,
    userId: normalizeString(data.userId) ?? id,
    groupId,
    clubId: groupId,
    status: (normalizeString(data.status) as MembershipRecord['status']) ?? 'approved',
    memberRole: (normalizeString(data.memberRole) as MembershipRecord['memberRole']) ?? 'member',
    approvedBy: normalizeString(data.approvedBy),
    approvedAt: toIsoValue(data.approvedAt as TimestampLike | string | null | undefined),
    createdAt:
      toIsoValue(data.createdAt as TimestampLike | string | null | undefined) ??
      toIsoValue(data.joinedAt as TimestampLike | string | null | undefined),
    updatedAt: toIsoValue(data.updatedAt as TimestampLike | string | null | undefined)
  };
}

export function mapEventData(id: string, data: FirestoreRecord): EventRecord {
  const startTime =
    toIsoValue(data.startTime as TimestampLike | string | null | undefined) ??
    toIsoValue(data.createdAt as TimestampLike | string | null | undefined) ??
    new Date(0).toISOString();
  const endTime =
    toIsoValue(data.endTime as TimestampLike | string | null | undefined) ??
    startTime;
  const relatedGroupId = inferGroupId(data);
  const scope = inferEventScope(data, relatedGroupId);
  const visibility = inferEventVisibility(data, scope, relatedGroupId);
  const category = inferEventCategory(data, scope, relatedGroupId);

  return {
    id,
    title: normalizeString(data.title) ?? 'Untitled event',
    description: normalizeString(data.description),
    category,
    scope,
    relatedGroupId,
    startTime,
    endTime,
    allDay: !!data.allDay,
    location: normalizeString(data.location),
    classroomLink: normalizeString(data.classroomLink) ?? null,
    classroomCourseId: normalizeString(data.classroomCourseId) ?? null,
    classroomPostLink: normalizeString(data.classroomPostLink) ?? null,
    meetLink: normalizeString(data.meetLink) ?? null,
    resourceLinks: mapResourceLinks(data.resourceLinks),
    attendanceEnabled: data.attendanceEnabled !== false,
    createdByUid: normalizeString(data.createdByUid) ?? normalizeString(data.authorId),
    createdByNameSnapshot:
      normalizeString(data.createdByNameSnapshot) ??
      normalizeString(data.authorName) ??
      normalizeString(data.postedByNameSnapshot),
    createdByEmailSnapshot:
      normalizeString(data.createdByEmailSnapshot) ??
      normalizeString(data.authorEmail) ??
      normalizeString(data.postedByEmailSnapshot),
    createdByRoleSnapshot:
      normalizeString(data.createdByRoleSnapshot) ??
      normalizeString(data.authorRole) ??
      normalizeString(data.postedByRoleSnapshot),
    visibility,
    sourceMetadata: {
      source: normalizeString((data.sourceMetadata as FirestoreRecord | undefined)?.source) ?? normalizeString(data.source),
      sourceId: normalizeString((data.sourceMetadata as FirestoreRecord | undefined)?.sourceId) ?? normalizeString(data.sourceId),
      sourceDataset:
        normalizeString((data.sourceMetadata as FirestoreRecord | undefined)?.sourceDataset) ??
        normalizeString(data.sourceDataset),
      sourceTerm: normalizeString((data.sourceMetadata as FirestoreRecord | undefined)?.sourceTerm) ?? normalizeString(data.sourceTerm),
      sourceHash: normalizeString((data.sourceMetadata as FirestoreRecord | undefined)?.sourceHash) ?? normalizeString(data.sourceHash)
    },
    clubId: relatedGroupId,
    rsvpCount: typeof data.rsvpCount === 'number' ? data.rsvpCount : 0,
    createdAt: toIsoValue(data.createdAt as TimestampLike | string | null | undefined),
    updatedAt: toIsoValue(data.updatedAt as TimestampLike | string | null | undefined)
  };
}

import type { ConvergentCategoryKey } from '../domain/categories';
import type { ResourceLink, VisibilityScope } from './Shared';

export type EventScope = 'school' | 'group' | 'academic';

export type EventSourceMetadata = {
  source?: string;
  sourceId?: string;
  sourceDataset?: string;
  sourceTerm?: string;
  sourceHash?: string;
};

export interface EventRecord {
  id: string;
  title: string;
  description?: string;
  category: ConvergentCategoryKey;
  scope: EventScope;
  relatedGroupId?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  classroomLink?: string | null;
  classroomCourseId?: string | null;
  classroomPostLink?: string | null;
  meetLink?: string | null;
  resourceLinks: ResourceLink[];
  attendanceEnabled: boolean;
  createdByUid?: string;
  createdByNameSnapshot?: string;
  createdByEmailSnapshot?: string;
  createdByRoleSnapshot?: string;
  visibility: VisibilityScope;
  sourceMetadata?: EventSourceMetadata;
  clubId?: string;
  rsvpCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

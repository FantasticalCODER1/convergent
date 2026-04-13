import type { ConvergentCategoryKey } from '../domain/categories';
import type { ResourceLink, VisibilityScope } from './Shared';

export interface PostRecord {
  id: string;
  title: string;
  content: string;
  category: ConvergentCategoryKey;
  relatedGroupId?: string | null;
  linkedEventId?: string | null;
  classroomLink?: string | null;
  meetLink?: string | null;
  resourceLinks: ResourceLink[];
  postedByUid: string;
  postedByNameSnapshot: string;
  postedByEmailSnapshot: string;
  postedByRoleSnapshot: string;
  visibility: VisibilityScope;
  createdAt?: string;
  updatedAt?: string;
}

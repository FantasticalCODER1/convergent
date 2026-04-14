import type { ConvergentCategoryKey } from '../domain/categories';
import type { ResourceLink, VisibilityScope } from './Shared';

export interface Club {
  id: string;
  name: string;
  description: string;
  category: ConvergentCategoryKey;
  groupType: 'club' | 'society' | 'supw' | 'sta' | 'centre_of_excellence';
  mic: string;
  schedule: string;
  meetingLocation?: string;
  logoUrl?: string;
  classroomLink?: string | null;
  classroomCode?: string | null;
  classroomCourseId?: string | null;
  defaultMeetLink?: string | null;
  meetLink?: string | null;
  resourceLinks: ResourceLink[];
  membershipMode?: 'open' | 'approval_required' | 'invite_only';
  visibility?: VisibilityScope;
  managerIds: string[];
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
}

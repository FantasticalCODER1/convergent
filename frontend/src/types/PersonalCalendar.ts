import type { ConvergentCategoryKey } from '../domain/categories';
import type { ScheduleType } from './Schedule';
import type { ResourceLink, VisibilityScope } from './Shared';
import type { UserRole } from './User';

export type PersonalCalendarItemSource = 'school_event' | 'group_event' | 'academic_schedule' | 'meal_schedule';
export type OverviewFilterKey = 'all' | 'academic' | 'groups' | 'school_wide' | 'meals';

export type PersonalCalendarItem = {
  id: string;
  sourceId: string;
  sourceType: 'event' | 'schedule';
  source: PersonalCalendarItemSource;
  title: string;
  description?: string;
  category: ConvergentCategoryKey;
  scope: 'school' | 'group' | 'academic';
  scheduleType?: ScheduleType;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  classroomLink?: string | null;
  classroomCourseId?: string | null;
  classroomPostLink?: string | null;
  meetLink?: string | null;
  resourceLinks: ResourceLink[];
  hiddenPrivateLinks: boolean;
  visibility: VisibilityScope;
  relatedGroup?: {
    id: string;
    name: string;
    category: ConvergentCategoryKey;
  };
  author?: {
    uid?: string;
    name?: string;
    email?: string;
    role?: UserRole | string;
  };
  metadata?: {
    blockName?: string;
    teacher?: string;
    sourceDataset?: string;
    visibilityReason?: string;
  };
};

export type PersonalCalendarDatasetReadiness = {
  academicStatus: 'ready' | 'placeholder' | 'missing';
  mealStatus: 'ready' | 'placeholder' | 'missing';
  academicEntriesMatched: number;
  mealEntriesMatched: number;
  profileReady: boolean;
};

export type PersonalCalendarCollection = {
  items: PersonalCalendarItem[];
  upcomingItems: PersonalCalendarItem[];
  nextAcademicItem: PersonalCalendarItem | null;
  nextMealItem: PersonalCalendarItem | null;
  nextGroupItem: PersonalCalendarItem | null;
  nextSchoolWideItem: PersonalCalendarItem | null;
  readiness: PersonalCalendarDatasetReadiness;
};

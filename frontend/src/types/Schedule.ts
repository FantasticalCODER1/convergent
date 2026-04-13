import type { ConvergentCategoryKey } from '../domain/categories';
import type { ResourceLink } from './Shared';

export type ScheduleType = 'academic' | 'meal';

export interface ScheduleEntry {
  id: string;
  scheduleType: ScheduleType;
  category: ConvergentCategoryKey;
  grade?: string;
  section?: string;
  dayOfWeek: number;
  blockName: string;
  title: string;
  teacher?: string;
  location?: string;
  startTime: string;
  endTime: string;
  resourceLinks: ResourceLink[];
  sourceDataset?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleDataset {
  id: string;
  scheduleType: ScheduleType;
  title: string;
  audienceLabel?: string;
  status: 'ready' | 'placeholder' | 'missing';
  sourceDataset?: string;
  notes?: string;
  updatedAt?: string;
}

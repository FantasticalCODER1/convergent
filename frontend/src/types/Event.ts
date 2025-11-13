export type EventKind = 'club' | 'school' | 'competition';

export interface EventRecord {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: EventKind;
  clubId?: string;
  source?: string;
  sourceId?: string;
  rsvpCount?: number;
  updatedAt?: string;
}

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  attending: boolean;
  respondedAt?: string;
}

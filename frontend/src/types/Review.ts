export type ProposedChangeStatus = 'pending_review' | 'approved' | 'rejected';

export interface InboundMessageRecord {
  id: string;
  sender: string;
  subject: string;
  receivedAt?: string;
  rawText?: string;
  htmlUrl?: string | null;
  parsedAnnouncementIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ParsedAnnouncementRecord {
  id: string;
  sourceMessageId: string;
  sender: string;
  subject: string;
  receivedAt?: string;
  parsedType: string;
  summary?: string;
  confidence?: number;
  affectedEventIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposedCalendarChangeRecord {
  id: string;
  sourceMessageId: string;
  sender: string;
  subject: string;
  receivedAt?: string;
  parsedType: string;
  affectedEventIds: string[];
  oldValues: Record<string, unknown>;
  proposedValues: Record<string, unknown>;
  confidence?: number;
  status: ProposedChangeStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChangeLogRecord {
  id: string;
  proposalId: string;
  sourceMessageId?: string;
  decision: Exclude<ProposedChangeStatus, 'pending_review'>;
  sender: string;
  subject: string;
  affectedEventIds: string[];
  oldValues: Record<string, unknown>;
  proposedValues: Record<string, unknown>;
  reviewedBy: string;
  reviewedAt?: string;
  createdAt?: string;
}

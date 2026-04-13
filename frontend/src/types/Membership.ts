export type MembershipStatus = 'pending' | 'approved' | 'rejected';
export type MembershipRole = 'member' | 'manager' | 'master' | 'admin';

export interface MembershipRecord {
  id: string;
  userId: string;
  groupId: string;
  clubId?: string;
  status: MembershipStatus;
  memberRole: MembershipRole;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

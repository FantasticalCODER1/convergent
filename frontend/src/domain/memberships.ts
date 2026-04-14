import type { MembershipRecord } from '../types/Membership';
import type { AppUser } from '../types/User';
import type { Club } from '../types/Club';
import type { EventRecord } from '../types/Event';
import type { PostRecord } from '../types/Post';
import { canManageClub } from '../lib/policy';

type MembershipMap = Record<string, MembershipRecord | undefined>;

export type ClubAccessState =
  | 'manager'
  | 'approved_member'
  | 'pending_member'
  | 'rejected_member'
  | 'not_joined';

export function getClubAccessState(
  user: AppUser | null | undefined,
  club: Club | null | undefined,
  membershipMap: MembershipMap
) {
  if (!club) return 'not_joined' as ClubAccessState;
  if (canManageClub(user, club)) return 'manager' as ClubAccessState;
  const membership = membershipMap[club.id];
  if (membership?.status === 'approved' || (user?.clubsJoined ?? []).includes(club.id)) return 'approved_member' as ClubAccessState;
  if (membership?.status === 'pending') return 'pending_member' as ClubAccessState;
  if (membership?.status === 'rejected') return 'rejected_member' as ClubAccessState;
  return 'not_joined' as ClubAccessState;
}

export function canViewPrivateClubContent(
  user: AppUser | null | undefined,
  club: Club | null | undefined,
  membershipMap: MembershipMap
) {
  const state = getClubAccessState(user, club, membershipMap);
  return state === 'manager' || state === 'approved_member';
}

export function stripPrivateEventLinks(event: EventRecord, allowPrivateLinks: boolean): EventRecord {
  if (allowPrivateLinks || event.visibility === 'school') return event;
  return {
    ...event,
    classroomLink: null,
    meetLink: null,
    resourceLinks: []
  };
}

export function stripPrivatePostLinks(post: PostRecord, allowPrivateLinks: boolean): PostRecord {
  if (allowPrivateLinks || post.visibility === 'school') return post;
  return {
    ...post,
    classroomLink: null,
    meetLink: null,
    resourceLinks: []
  };
}

export function getClubJoinActionLabel(accessState: ClubAccessState, membershipMode?: Club['membershipMode']) {
  if (accessState === 'manager' || accessState === 'approved_member') return 'Leave club';
  if (accessState === 'pending_member') return 'Cancel request';
  if (membershipMode === 'approval_required') return 'Request to join';
  if (membershipMode === 'invite_only') return 'Invite only';
  return 'Join club';
}

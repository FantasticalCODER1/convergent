import clsx from 'clsx';
import { UsersRound } from 'lucide-react';
import { getCategoryMeta } from '../domain/categories';
import { formatRelativeEventWindow } from '../lib/formatters';
import type { EventRecord } from '../types/Event';
import type { Club } from '../types/Club';
import type { ClubAccessState } from '../domain/memberships';

type Props = {
  club: Club;
  joined?: boolean;
  manageable?: boolean;
  membershipState?: ClubAccessState;
  nextEvent?: EventRecord;
  openLabel?: string;
  onJoin?: (clubId: string) => Promise<void> | void;
  onLeave?: (clubId: string) => Promise<void> | void;
  onOpen?: (club: Club) => void;
};

export function ClubCard({
  club,
  joined,
  manageable,
  membershipState = joined ? 'approved_member' : 'not_joined',
  nextEvent,
  openLabel = 'Open club',
  onJoin,
  onLeave,
  onOpen
}: Props) {
  const handleAction = () => {
    if (manageable) return;
    if (joined || membershipState === 'pending_member') {
      onLeave?.(club.id);
    } else {
      onJoin?.(club.id);
    }
  };
  const category = getCategoryMeta(club.category);
  const actionLabel =
    membershipState === 'pending_member'
      ? 'Cancel request'
      : joined
        ? 'Leave club'
        : club.membershipMode === 'approval_required'
          ? 'Request to join'
          : club.membershipMode === 'invite_only'
            ? 'Invite only'
            : 'Join club';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{category.shortLabel}</p>
          <h3 className="text-xl font-semibold">{club.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/70">
          <UsersRound className="size-4" />
          {club.memberCount}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {manageable ? <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-emerald-100">Managing</span> : null}
        {joined && !manageable ? <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-indigo-100">Member</span> : null}
        {membershipState === 'pending_member' ? <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-amber-50">Pending approval</span> : null}
        {!joined && !manageable && membershipState !== 'pending_member' ? (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/60">
            {club.membershipMode === 'approval_required' ? 'Approval required' : club.membershipMode === 'invite_only' ? 'Invite only' : 'Open to join'}
          </span>
        ) : null}
      </div>
      <p className="mt-3 min-h-12 text-sm leading-6 text-white/70">{club.description || 'Club description pending.'}</p>
      <div className="mt-4 space-y-2 text-sm text-white/65">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
          <span>MIC</span>
          <span className="text-right text-white">{club.mic}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
          <span>Schedule</span>
          <span className="text-right text-white">{club.schedule}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
          <span>Links</span>
          <span className="text-right text-white">
            {joined || manageable
              ? club.classroomLink || club.classroomCode || club.classroomCourseId || club.defaultMeetLink || club.meetLink || club.resourceLinks.length > 0
                ? 'Attached'
                : 'Placeholder ready'
              : 'Hidden until approved'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
          <span>Next event</span>
          <span className="text-right text-white">{nextEvent ? formatRelativeEventWindow(nextEvent.startTime, nextEvent.endTime) : 'None scheduled'}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(club)}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            {openLabel}
          </button>
        )}
        {(onJoin || onLeave) && !manageable && (
          <button
            type="button"
            disabled={club.membershipMode === 'invite_only' && !joined}
            onClick={handleAction}
            className={clsx(
              'rounded-2xl px-4 py-2 text-sm font-medium transition',
              club.membershipMode === 'invite_only' && !joined
                ? 'bg-white/10 text-white/40'
                : joined || membershipState === 'pending_member'
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

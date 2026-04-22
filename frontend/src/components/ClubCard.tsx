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
    <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,25,43,0.92),rgba(13,19,34,0.92))] p-5 text-[var(--text)] shadow-[0_24px_60px_rgba(3,8,22,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">{category.shortLabel}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-strong)]">{club.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
          <UsersRound className="size-4" />
          {club.memberCount}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {manageable ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/12 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-emerald-100">Managing</span> : null}
        {joined && !manageable ? <span className="rounded-full border border-indigo-400/20 bg-indigo-500/12 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-indigo-100">Member</span> : null}
        {membershipState === 'pending_member' ? <span className="rounded-full border border-amber-300/20 bg-amber-400/12 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-amber-50">Pending approval</span> : null}
        {!joined && !manageable && membershipState !== 'pending_member' ? (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
            {club.membershipMode === 'approval_required' ? 'Approval required' : club.membershipMode === 'invite_only' ? 'Invite only' : 'Open to join'}
          </span>
        ) : null}
      </div>

      <p className="mt-4 min-h-12 text-sm leading-7 text-[var(--text-muted)]">{club.description || 'Club description pending.'}</p>

      <div className="mt-5 space-y-2 text-sm text-[var(--text-muted)]">
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-4 py-3">
          <span>MIC</span>
          <span className="text-right font-medium text-[var(--text-strong)]">{club.mic}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-4 py-3">
          <span>Schedule</span>
          <span className="text-right font-medium text-[var(--text-strong)]">{club.schedule}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-4 py-3">
          <span>Links</span>
          <span className="text-right font-medium text-[var(--text-strong)]">
            {joined || manageable
              ? club.classroomLink || club.classroomCode || club.classroomCourseId || club.defaultMeetLink || club.meetLink || club.resourceLinks.length > 0
                ? 'Attached'
                : 'Placeholder ready'
              : 'Hidden until approved'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[rgba(10,15,27,0.34)] px-4 py-3">
          <span>Next event</span>
          <span className="text-right font-medium text-[var(--text-strong)]">{nextEvent ? formatRelativeEventWindow(nextEvent.startTime, nextEvent.endTime) : 'None scheduled'}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(club)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
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
              'rounded-full px-4 py-2 text-sm font-medium transition',
              club.membershipMode === 'invite_only' && !joined
                ? 'bg-white/10 text-white/40'
                : joined || membershipState === 'pending_member'
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-[var(--accent)] text-slate-950 hover:brightness-105'
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

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
    <div className="rounded-[12px] border border-[color:var(--line)] bg-[color:var(--panel)] p-5 text-[var(--text)] shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--text-faint)]">{category.shortLabel}</p>
          <h3 className="mt-2 text-[1.6rem] font-semibold tracking-[-0.04em] text-[var(--text-strong)]">{club.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
          <UsersRound className="size-4" />
          {club.memberCount}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {manageable ? <span className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-700">Managing</span> : null}
        {joined && !manageable ? <span className="rounded-[8px] border border-[color:var(--academic-blue-line)] bg-[var(--academic-blue-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--academic-blue)]">Member</span> : null}
        {membershipState === 'pending_member' ? <span className="rounded-[8px] border border-[color:var(--gold-line)] bg-[var(--gold-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--brass)]">Pending approval</span> : null}
        {!joined && !manageable && membershipState !== 'pending_member' ? (
          <span className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-2)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {club.membershipMode === 'approval_required' ? 'Approval required' : club.membershipMode === 'invite_only' ? 'Invite only' : 'Open to join'}
          </span>
        ) : null}
      </div>

      <p className="mt-4 min-h-12 text-sm leading-7 text-[var(--text-muted)]">{club.description || 'Club description pending.'}</p>

      <div className="mt-5 space-y-2 text-sm text-[var(--text-muted)]">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line-soft)] px-1 py-2.5">
          <span>MIC</span>
          <span className="text-right font-medium text-[var(--text-strong)]">{club.mic}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line-soft)] px-1 py-2.5">
          <span>Schedule</span>
          <span className="text-right font-medium text-[var(--text-strong)]">{club.schedule}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line-soft)] px-1 py-2.5">
          <span>Links</span>
          <span className="text-right font-medium text-[var(--text-strong)]">
            {joined || manageable
              ? club.classroomLink || club.classroomCode || club.classroomCourseId || club.defaultMeetLink || club.meetLink || club.resourceLinks.length > 0
                ? 'Attached'
                : 'Placeholder ready'
              : 'Hidden until approved'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-1 py-2.5">
          <span>Next event</span>
          <span className="text-right font-medium text-[var(--text-strong)]">{nextEvent ? formatRelativeEventWindow(nextEvent.startTime, nextEvent.endTime) : 'None scheduled'}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(club)}
            className="rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
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
              'rounded-[10px] px-4 py-2 text-sm font-medium transition',
              club.membershipMode === 'invite_only' && !joined
                ? 'bg-[color:var(--panel-2)] text-[var(--text-faint)]'
                : joined || membershipState === 'pending_member'
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                  : 'bg-[var(--academic-blue)] text-white hover:brightness-110'
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

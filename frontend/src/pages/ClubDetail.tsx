import { addDays, subDays } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { CalendarDays, ChevronLeft, ExternalLink, FileBadge2, Info, MessageSquareText, UsersRound } from 'lucide-react';
import { CertificateCard } from '../components/CertificateCard';
import { ClubManagementPanel } from '../components/club/ClubManagementPanel';
import { EventCard } from '../components/EventCard';
import { getCategoryMeta } from '../domain/categories';
import {
  canViewPrivateClubContent,
  getClubAccessState,
  getClubJoinActionLabel,
  stripPrivateEventLinks,
  stripPrivatePostLinks
} from '../domain/memberships';
import { useAuth } from '../hooks/useAuth';
import { useCertificates } from '../hooks/useCertificates';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { formatDateTimeRange, formatRelativeEventWindow, formatTimestamp } from '../lib/formatters';
import { canManageClub } from '../lib/policy';
import { shouldUseStudentClubPlaceholder } from '../lib/productTruth';
import { listCertificatesForClub } from '../services/certificatesService';
import { listEventAttendance, type EventAttendanceRecord } from '../services/eventsService';
import { listClubUsers } from '../services/usersService';
import type { CertificateRecord } from '../types/Certificate';
import type { EventRecord } from '../types/Event';
import type { PostRecord } from '../types/Post';
import type { Club } from '../types/Club';
import type { AppUser } from '../types/User';

type ClubTab = 'about' | 'posts' | 'events' | 'members' | 'certificates';

function isPermissionDenied(error: unknown) {
  const message = String((error as { code?: string; message?: string } | null)?.code ?? (error as { message?: string } | null)?.message ?? '');
  return /permission-denied|permission denied|insufficient permissions|missing or insufficient permissions/i.test(message);
}

const tabMeta: Array<{ id: ClubTab; label: string; icon: typeof Info }> = [
  { id: 'about', label: 'About', icon: Info },
  { id: 'posts', label: 'Posts', icon: MessageSquareText },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'members', label: 'Members', icon: UsersRound },
  { id: 'certificates', label: 'Certificates', icon: FileBadge2 }
];

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const {
    getClubById,
    joinClub,
    leaveClub,
    fetchPosts,
    submitPost,
    postsForClub,
    membershipMap,
    fetchMembershipRequests,
    membershipRequestsForClub,
    reviewMembership
  } = useClubs();
  const eventWindow = useMemo(
    () => ({
      rangeStart: subDays(new Date(), 30),
      rangeEnd: addDays(new Date(), 180)
    }),
    []
  );
  const { events, refresh: refreshEvents, saveEvent, rsvps, toggleRsvp, error: eventsError } = useEvents({
    autoLoad: false,
    rangeStart: eventWindow.rangeStart,
    rangeEnd: eventWindow.rangeEnd
  });
  const { certificates: myCertificates } = useCertificates();
  const [activeTab, setActiveTab] = useState<ClubTab>('about');
  const [club, setClub] = useState<Club | null>(null);
  const [clubUsers, setClubUsers] = useState<AppUser[]>([]);
  const [clubCertificates, setClubCertificates] = useState<CertificateRecord[]>([]);
  const [attendance, setAttendance] = useState<EventAttendanceRecord[]>([]);
  const [attendanceEventId, setAttendanceEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingManagement, setLoadingManagement] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setAccessDenied(false);
    void (async () => {
      let doc: Club | null = null;
      let denied = false;
      try {
        doc = await getClubById(id);
      } catch (error) {
        if (isPermissionDenied(error)) {
          denied = true;
        } else {
          throw error;
        }
      }
      try {
        await Promise.all([denied ? Promise.resolve([]) : fetchPosts(id), refreshEvents()]);
      } catch {}
      if (!cancelled) {
        setClub(doc ?? null);
        setAccessDenied(denied);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getClubById, fetchPosts, refreshEvents]);

  const accessState = getClubAccessState(user, club, membershipMap);
  const manageable = canManageClub(user, club);
  const showStudentPlaceholder = shouldUseStudentClubPlaceholder(user) && !manageable;
  const workspaceRoute = location.pathname.startsWith('/my-clubs/');
  const showManagementPanel = manageable && workspaceRoute;
  const canAccessPrivateContent = canViewPrivateClubContent(user, club, membershipMap);

  useEffect(() => {
    if (!showManagementPanel || !club) {
      setClubUsers([]);
      setClubCertificates([]);
      return;
    }
    let cancelled = false;
    setLoadingManagement(true);
    void Promise.all([listClubUsers(club.id), listCertificatesForClub(club.id), fetchMembershipRequests(club.id)])
      .then(([users, certificates]) => {
        if (!cancelled) {
          setClubUsers(users);
          setClubCertificates(certificates);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClubUsers([]);
          setClubCertificates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingManagement(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [club, fetchMembershipRequests, showManagementPanel]);

  const posts = club ? postsForClub(club.id) : [];
  const membershipRequests = club ? membershipRequestsForClub(club.id) : [];
  const clubEvents = useMemo(
    () =>
      (club ? events.filter((event) => event.relatedGroupId === club.id || event.clubId === club.id) : []).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    [club, events]
  );
  const linkedEventsMap = useMemo(
    () =>
      clubEvents.reduce<Record<string, EventRecord>>((acc, event) => {
        acc[event.id] = event;
        return acc;
      }, {}),
    [clubEvents]
  );
  const visibleEvents = useMemo(
    () => clubEvents.map((event) => stripPrivateEventLinks(event, canAccessPrivateContent)),
    [canAccessPrivateContent, clubEvents]
  );
  const visiblePosts = useMemo(
    () => posts.map((post) => stripPrivatePostLinks(post, canAccessPrivateContent)),
    [canAccessPrivateContent, posts]
  );
  const upcomingEvents = visibleEvents.filter((event) => new Date(event.startTime).getTime() >= Date.now());
  const myClubCertificates = useMemo(
    () => (club ? myCertificates.filter((certificate) => certificate.clubId === club.id) : []),
    [club, myCertificates]
  );
  const availableTabs = useMemo(
    () =>
      tabMeta.filter((tab) => {
        if (!workspaceRoute) {
          return tab.id === 'about' || tab.id === 'posts' || tab.id === 'events';
        }
        if (tab.id === 'members') return showManagementPanel;
        if (tab.id === 'certificates') return accessState === 'approved_member' || showManagementPanel;
        return true;
      }),
    [accessState, showManagementPanel, workspaceRoute]
  );

  useEffect(() => {
    setActiveTab(workspaceRoute ? 'posts' : 'about');
  }, [id, workspaceRoute]);

  useEffect(() => {
    if (!showManagementPanel || clubEvents.length === 0) {
      setAttendanceEventId(null);
      setAttendance([]);
      return;
    }
    setAttendanceEventId((current) => (current && clubEvents.some((event) => event.id === current) ? current : clubEvents[0].id));
  }, [clubEvents, showManagementPanel]);

  useEffect(() => {
    if (!showManagementPanel || !attendanceEventId) {
      setAttendance([]);
      return;
    }
    let cancelled = false;
    setLoadingAttendance(true);
    void listEventAttendance(attendanceEventId)
      .then((records) => {
        if (!cancelled) {
          setAttendance(records);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttendance([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAttendance(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attendanceEventId, showManagementPanel]);

  const refreshClubData = async () => {
    await Promise.all([fetchPosts(club?.id ?? ''), refreshEvents()]);
    if (club && showManagementPanel) {
      const [users, certificates] = await Promise.all([listClubUsers(club.id), listCertificatesForClub(club.id), fetchMembershipRequests(club.id)]);
      setClubUsers(users);
      setClubCertificates(certificates);
    }
  };

  if (!id) {
    return <StateCard title="Club not found" body="The club link is missing an id." />;
  }

  if (loading) {
    return <StateCard title="Loading club" body="Pulling club details, posts, events, and membership state." />;
  }

  if (!club) {
    if (accessDenied) {
      return (
        <StateCard
          title="Private club"
          body="This club is not readable from your account. Private clubs are hidden entirely until you have approved membership or club management access."
        />
      );
    }
    return <StateCard title="Club unavailable" body="This club record no longer exists." />;
  }

  if (showStudentPlaceholder) {
    return (
      <StateCard
        title="Student clubs are still placeholder-only"
        body="This route stays hidden from the ordinary student experience until real club data replaces the development fixtures. Calendar, classes, and certificates remain the truthful student surfaces."
      />
    );
  }

  const category = getCategoryMeta(club.category);
  const routeEyebrow = workspaceRoute
    ? showManagementPanel
      ? 'Manager workspace'
      : accessState === 'approved_member'
        ? 'Member workspace'
        : 'Workspace access'
    : 'Club detail';
  const routeSummary = workspaceRoute
    ? showManagementPanel
      ? 'This route is the real operations workspace for the club. Discovery copy and manager tooling are intentionally separated now.'
      : accessState === 'approved_member'
        ? 'This route is your member workspace for approved posts, events, and certificate history tied to this club.'
        : 'This route is reserved for approved membership or management access. If you only need discovery context, use the browse detail route instead.'
    : manageable
      ? 'This is the browse/detail view. Manager tools stay on the workspace route so discovery does not double as an admin console.'
      : accessState === 'approved_member'
        ? 'This is the browse/detail view. Your member workspace lives on the My Clubs route.'
        : 'This is the browse/detail view for readable club information. Workspace actions stay separate until you have approved access.';

  const stats = [
    { label: 'Members', value: String(club.memberCount), hint: showManagementPanel ? `${clubUsers.length || club.memberCount} approved profiles` : 'Approved member count' },
    { label: 'Upcoming', value: String(upcomingEvents.length), hint: upcomingEvents[0] ? formatRelativeEventWindow(upcomingEvents[0].startTime, upcomingEvents[0].endTime) : 'No upcoming event yet' },
    { label: 'Posts', value: String(visiblePosts.length), hint: visiblePosts[0]?.createdAt ? `Latest ${formatTimestamp(visiblePosts[0].createdAt)}` : 'No timeline posts yet' },
    {
      label: 'Certificates',
      value: String(showManagementPanel ? clubCertificates.length : myClubCertificates.length),
      hint: showManagementPanel ? 'Club-issued records' : 'Your club certificates'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={workspaceRoute ? '/my-clubs' : '/join-clubs'} className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
          <ChevronLeft className="size-4" />
          Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">{category.label}</span>
          {manageable ? <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100">Manager</span> : null}
          {accessState === 'approved_member' ? <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-indigo-100">Approved member</span> : null}
          {accessState === 'pending_member' ? <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-50">Pending approval</span> : null}
        </div>
      </div>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-white shadow-glass">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{routeEyebrow}</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">{club.name}</h1>
              <p className="mt-3 max-w-2xl text-base text-white/75">{club.description || 'This club description has not been filled in yet.'}</p>
              <p className="mt-3 max-w-2xl text-sm text-white/55">{routeSummary}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-white/65">
              <span className="rounded-full border border-white/10 px-3 py-2">{category.label}</span>
              <span className="rounded-full border border-white/10 px-3 py-2">MIC · {club.mic}</span>
              <span className="rounded-full border border-white/10 px-3 py-2">{club.schedule}</span>
              <span className="rounded-full border border-white/10 px-3 py-2">
                {club.membershipMode === 'approval_required' ? 'Approval required' : club.membershipMode === 'invite_only' ? 'Invite only' : 'Open membership'}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-2">{club.managerIds.length || 0} coordinator{club.managerIds.length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/45">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-1 text-xs text-white/50">{stat.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3 xl:items-end">
            {!manageable ? (
              <button
                type="button"
                disabled={club.membershipMode === 'invite_only' && accessState !== 'approved_member'}
                onClick={() => (accessState === 'approved_member' || accessState === 'pending_member' ? leaveClub(club.id) : joinClub(club.id))}
                className={clsx(
                  'rounded-2xl px-5 py-3 text-sm font-medium transition',
                  club.membershipMode === 'invite_only' && accessState !== 'approved_member'
                    ? 'bg-white/10 text-white/45'
                    : accessState === 'approved_member' || accessState === 'pending_member'
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                )}
              >
                {getClubJoinActionLabel(accessState, club.membershipMode)}
              </button>
            ) : (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-100">
                {showManagementPanel ? 'You are in the manager workspace.' : 'You manage this club.'}
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/70">
              {showManagementPanel
                ? 'Manager tools are active on this route. Private membership access and private links are enforced in backend reads, not just hidden in the UI.'
                : manageable
                  ? 'Discovery and detail remain separate from operations. Use the workspace route when you need approvals, editing, attendance, or certificate issuance.'
                : accessState === 'approved_member'
                  ? workspaceRoute
                    ? 'Approved membership makes private event and post links readable here and feeds this club into your personal calendar automatically.'
                    : 'Approved membership makes private content readable, but your member workspace lives on the My Clubs route.'
                  : accessState === 'pending_member'
                    ? 'Your request is pending. Private content stays unreadable until approval is granted.'
                    : 'Only school-visible clubs are browseable here. Private clubs are not readable until you have approved access.'}
            </div>
            {manageable && !workspaceRoute ? (
              <Link
                to={`/my-clubs/${club.id}`}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                Open workspace
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm transition',
                active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-transparent text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={clsx('grid gap-6', showManagementPanel ? 'xl:grid-cols-[minmax(0,1.5fr)_380px]' : 'grid-cols-1')}>
        <section className="space-y-4">
          {activeTab === 'about' ? (
            <AboutTab club={club} accessState={accessState} canAccessPrivateContent={canAccessPrivateContent} upcomingEvents={upcomingEvents} />
          ) : null}
          {activeTab === 'posts' ? (
            <PostsTab
              posts={visiblePosts}
              linkedEventsMap={linkedEventsMap}
              canAccessPrivateContent={canAccessPrivateContent}
              manageable={showManagementPanel}
            />
          ) : null}
          {activeTab === 'events' ? (
            <EventsTab
              events={visibleEvents}
              rsvps={rsvps}
              onRsvp={toggleRsvp}
              manageable={showManagementPanel}
              canAccessPrivateContent={canAccessPrivateContent}
              error={eventsError}
            />
          ) : null}
          {activeTab === 'members' ? (
            <MembersTab club={club} users={clubUsers} manageable={showManagementPanel} loading={loadingManagement} membershipRequests={membershipRequests} />
          ) : null}
          {activeTab === 'certificates' ? (
            <CertificatesTab
              manageable={showManagementPanel}
              loading={loadingManagement}
              clubCertificates={clubCertificates}
              myCertificates={myClubCertificates}
            />
          ) : null}
        </section>

        {showManagementPanel ? (
          <ClubManagementPanel
            club={club}
            users={clubUsers}
            events={clubEvents}
            certificates={clubCertificates}
            attendance={attendance}
            attendanceEventId={attendanceEventId}
            attendanceLoading={loadingAttendance}
            membershipRequests={membershipRequests}
            onSelectAttendanceEvent={setAttendanceEventId}
            onSaveEvent={saveEvent}
            onCreateContent={async (payload) => {
              let linkedEvent: EventRecord | null = null;
              if (payload.mode === 'event' || payload.mode === 'post_event') {
                if (!payload.event) return;
                linkedEvent = await saveEvent({
                  title: payload.event.title,
                  description: payload.event.description,
                  category: payload.event.category,
                  scope: 'group',
                  relatedGroupId: club.id,
                  startTime: new Date(`${payload.event.date}T${payload.event.startTime}`).toISOString(),
                  endTime: new Date(`${payload.event.date}T${payload.event.endTime}`).toISOString(),
                  location: payload.event.location,
                  classroomLink: payload.event.classroomLink,
                  classroomCourseId: payload.event.classroomCourseId,
                  classroomPostLink: payload.event.classroomPostLink,
                  meetLink: payload.event.meetLink,
                  resourceLinks: payload.event.resourceLinks,
                  attendanceEnabled: payload.event.attendanceEnabled
                });
              }
              if (payload.mode === 'post' || payload.mode === 'post_event') {
                await submitPost(club.id, {
                  title: payload.title,
                  content: payload.content,
                  category: payload.category,
                  linkedEventId: linkedEvent?.id ?? null,
                  classroomLink: payload.event?.classroomLink ?? null,
                  meetLink: payload.event?.meetLink ?? null,
                  resourceLinks: payload.event?.resourceLinks ?? [],
                  visibility: 'members'
                });
              }
              await refreshClubData();
            }}
            onReviewMembership={async (userId, status) => {
              await reviewMembership(club.id, userId, status);
              await refreshClubData();
            }}
            onRefresh={refreshClubData}
            editorMode={user?.role === 'admin' ? 'admin' : 'manager'}
          />
        ) : null}
      </div>
    </div>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 shadow-glass">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-2">{body}</p>
    </div>
  );
}

function AboutTab({
  club,
  accessState,
  canAccessPrivateContent,
  upcomingEvents
}: {
  club: Club;
  accessState: ReturnType<typeof getClubAccessState>;
  canAccessPrivateContent: boolean;
  upcomingEvents: EventRecord[];
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Club brief</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <h2 className="text-xl font-semibold text-white">What this club is for</h2>
            <p className="mt-3 text-sm leading-7 text-white/75">{club.description || 'A fuller club description has not been entered yet.'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <h2 className="text-xl font-semibold text-white">Access and links</h2>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <span className="text-white/45">Membership</span>
                <span className="text-right text-white">{accessState.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <span className="text-white/45">Private links</span>
                <span className="text-right text-white">{canAccessPrivateContent ? 'Readable for approved members' : 'Not readable until approved'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/45">Membership model</span>
                <span className="text-right text-white">{club.membershipMode === 'approval_required' ? 'Request then approval' : club.membershipMode === 'invite_only' ? 'Invite only' : 'Open self-serve'}</span>
              </div>
            </div>
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/45">Classroom course id</span>
                <span className="text-right text-white">{club.classroomCourseId ?? 'Not attached'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/45">Classroom code</span>
                <span className="text-right text-white">{club.classroomCode ?? 'Not attached'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/45">Resource links</span>
                <span className="text-right text-white">{club.resourceLinks.length} attached</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                  {canAccessPrivateContent && club.classroomLink ? (
                <a href={club.classroomLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                  Open Classroom
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
                  {canAccessPrivateContent && (club.defaultMeetLink ?? club.meetLink) ? (
                <a href={club.defaultMeetLink ?? club.meetLink ?? ''} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                  Open Default Meet
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Next up</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Upcoming club events</h2>
          </div>
          <Link to="/calendar" className="text-sm text-indigo-300 transition hover:text-indigo-100">
            Open full calendar
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">No upcoming events are scheduled for this club yet.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{event.title}</p>
                    <p className="mt-1 text-sm text-white/60">{formatDateTimeRange(event.startTime, event.endTime)}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/60">
                    {event.category}
                  </span>
                </div>
                {event.description ? <p className="mt-3 text-sm text-white/70">{event.description}</p> : null}
                {event.location ? <p className="mt-3 text-xs text-white/50">Location · {event.location}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PostsTab({
  posts,
  linkedEventsMap,
  canAccessPrivateContent,
  manageable
}: {
  posts: PostRecord[];
  linkedEventsMap: Record<string, EventRecord>;
  canAccessPrivateContent: boolean;
  manageable: boolean;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Timeline</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Posts and updates</h2>
        </div>
        <span className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/60">
          {manageable ? 'Publish new items from the operations rail.' : 'Posts can link directly to a scheduled event.'}
        </span>
      </div>
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">No updates yet.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const linkedEvent = post.linkedEventId ? linkedEventsMap[post.linkedEventId] : null;
            const meta = getCategoryMeta(post.category);
            const hasPrivateLinks = !canAccessPrivateContent && !!(post.classroomLink || post.meetLink || post.resourceLinks.length > 0);
            return (
              <div key={post.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/70">{meta.label}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/45">
                    {formatTimestamp(post.createdAt, 'Just now')}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{post.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/80">{post.content}</p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                  <p className="font-medium text-white">{post.postedByNameSnapshot}</p>
                  <p className="text-xs text-white/50">{post.postedByEmailSnapshot}</p>
                  <p className="mt-1 text-xs text-white/45">{post.postedByRoleSnapshot}</p>
                </div>
                {linkedEvent ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Linked event</p>
                    <p className="mt-2 font-medium text-white">{linkedEvent.title}</p>
                    <p className="mt-1 text-xs text-white/55">{formatDateTimeRange(linkedEvent.startTime, linkedEvent.endTime)}</p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.classroomLink ? (
                    <a href={post.classroomLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                      Open Classroom
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {post.meetLink ? (
                    <a href={post.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                      Open Meet
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {post.resourceLinks.map((link) => (
                    <a key={`${post.id}:${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
                      {link.label}
                      <ExternalLink className="size-4" />
                    </a>
                  ))}
                </div>
                {hasPrivateLinks ? <p className="mt-4 text-xs text-white/45">Private links are not readable until your membership is approved.</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EventsTab({
  events,
  rsvps,
  onRsvp,
  manageable,
  canAccessPrivateContent,
  error
}: {
  events: EventRecord[];
  rsvps: Record<string, boolean>;
  onRsvp: (eventId: string, attending: boolean) => Promise<void>;
  manageable: boolean;
  canAccessPrivateContent: boolean;
  error?: string | null;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Events</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Club calendar and activity</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/60">
          {manageable ? 'Create and edit from the operations rail.' : 'Private links become readable only after approval.'}
        </div>
      </div>
      {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-500/5 p-4 text-sm text-rose-100">{error}</div> : null}
      {events.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">No club events have been created yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <div key={event.id} className="space-y-2">
              <EventCard event={event} attending={rsvps[event.id]} onRsvp={event.attendanceEnabled ? onRsvp : undefined} />
              {!event.attendanceEnabled ? <p className="text-xs text-white/45">RSVP is disabled for this event.</p> : null}
              {!canAccessPrivateContent && (event.classroomLink || event.classroomPostLink || event.meetLink || event.resourceLinks.length > 0) ? (
                <p className="text-xs text-white/45">Private links are not readable until membership approval.</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MembersTab({
  club,
  users,
  manageable,
  loading,
  membershipRequests
}: {
  club: Club;
  users: AppUser[];
  manageable: boolean;
  loading: boolean;
  membershipRequests: Array<{ userId: string; user: AppUser | null }>;
}) {
  if (!manageable) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Members</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Membership visibility is scoped</h2>
        <p className="mt-3 text-sm text-white/70">
          This club currently has {club.memberCount} approved member{club.memberCount === 1 ? '' : 's'}. The full roster and approval queue are visible to club coordinators and admins only.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Members</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Club roster</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/60">
          {membershipRequests.length} pending request{membershipRequests.length === 1 ? '' : 's'}
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">Loading roster…</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">No approved member profiles are available yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((member) => (
            <div key={member.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{member.name}</p>
                  <p className="text-sm text-white/60">{member.email}</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/70">{member.role}</span>
              </div>
              <p className="mt-3 text-xs text-white/45">
                {member.clubsJoined.includes(club.id) ? 'Approved member' : 'Club management access'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CertificatesTab({
  manageable,
  loading,
  clubCertificates,
  myCertificates
}: {
  manageable: boolean;
  loading: boolean;
  clubCertificates: CertificateRecord[];
  myCertificates: CertificateRecord[];
}) {
  const certificates = manageable ? clubCertificates : myCertificates;

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Certificates</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{manageable ? 'Club-issued certificate history' : 'Your records from this club'}</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/60">
          {manageable ? 'Issue new records from the operations rail.' : 'Verification links stay attached to each record.'}
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">Loading certificates…</div>
      ) : certificates.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">
          {manageable ? 'No certificates have been issued for this club yet.' : 'You do not have any certificates from this club yet.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      )}
    </section>
  );
}

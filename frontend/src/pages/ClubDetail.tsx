import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, FileBadge2, Info, MessageSquareText, UsersRound } from 'lucide-react';
import { CertificateCard } from '../components/CertificateCard';
import { ClubManagementPanel } from '../components/club/ClubManagementPanel';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../hooks/useAuth';
import { useCertificates } from '../hooks/useCertificates';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { formatDateTimeRange, formatRelativeEventWindow, formatTimestamp } from '../lib/formatters';
import { canManageClub } from '../lib/policy';
import { listCertificatesForClub } from '../services/certificatesService';
import { listEventAttendance, type EventAttendanceRecord } from '../services/eventsService';
import { listClubUsers } from '../services/usersService';
import type { CertificateRecord } from '../types/Certificate';
import type { Club, ClubPost } from '../types/Club';
import type { EventRecord } from '../types/Event';
import type { AppUser } from '../types/User';

type ClubTab = 'about' | 'posts' | 'events' | 'members' | 'certificates';

const tabMeta: Array<{ id: ClubTab; label: string; icon: typeof Info }> = [
  { id: 'about', label: 'About', icon: Info },
  { id: 'posts', label: 'Posts', icon: MessageSquareText },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'members', label: 'Members', icon: UsersRound },
  { id: 'certificates', label: 'Certificates', icon: FileBadge2 }
];

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getClubById, joinClub, leaveClub, fetchPosts, submitPost, postsForClub } = useClubs();
  const { events, refresh: refreshEvents, saveEvent, rsvps, toggleRsvp } = useEvents({ autoLoad: false });
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
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const doc = await getClubById(id);
      try {
        await Promise.all([fetchPosts(id), refreshEvents()]);
      } catch {}
      if (!cancelled) {
        setClub(doc ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getClubById, fetchPosts, refreshEvents]);

  const posts = club ? postsForClub(club.id) : [];
  const manageable = canManageClub(user, club);
  const joined = !!club && (user?.clubsJoined ?? []).includes(club.id);
  const clubEvents = useMemo(
    () =>
      (club ? events.filter((event) => event.clubId === club.id) : []).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    [club, events]
  );
  const upcomingEvents = clubEvents.filter((event) => new Date(event.startTime).getTime() >= Date.now());
  const myClubCertificates = useMemo(
    () => (club ? myCertificates.filter((certificate) => certificate.clubId === club.id) : []),
    [club, myCertificates]
  );

  useEffect(() => {
    if (!manageable || !club) {
      setClubUsers([]);
      setClubCertificates([]);
      return;
    }
    let cancelled = false;
    setLoadingManagement(true);
    void Promise.all([listClubUsers(club.id), listCertificatesForClub(club.id)])
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
  }, [club, manageable]);

  useEffect(() => {
    if (!manageable || clubEvents.length === 0) {
      setAttendanceEventId(null);
      setAttendance([]);
      return;
    }
    setAttendanceEventId((current) => (current && clubEvents.some((event) => event.id === current) ? current : clubEvents[0].id));
  }, [clubEvents, manageable]);

  useEffect(() => {
    if (!manageable || !attendanceEventId) {
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
  }, [attendanceEventId, manageable]);

  const handlePost = async (text: string) => {
    if (!club || !text.trim()) return;
    setPosting(true);
    try {
      await submitPost(club.id, text.trim());
    } finally {
      setPosting(false);
    }
  };

  const refreshClubData = async () => {
    await refreshEvents();
    if (club && manageable) {
      const [users, certificates] = await Promise.all([listClubUsers(club.id), listCertificatesForClub(club.id)]);
      setClubUsers(users);
      setClubCertificates(certificates);
    }
  };

  if (!id) {
    return <StateCard title="Club not found" body="The club link is missing an id." />;
  }

  if (loading) {
    return <StateCard title="Loading club" body="Pulling club details, posts, and events." />;
  }

  if (!club) {
    return <StateCard title="Club unavailable" body="This club record no longer exists." />;
  }

  const stats = [
    { label: 'Members', value: String(club.memberCount), hint: manageable ? `${clubUsers.length || club.memberCount} rostered profiles` : 'Live membership count' },
    { label: 'Upcoming', value: String(upcomingEvents.length), hint: upcomingEvents[0] ? formatRelativeEventWindow(upcomingEvents[0].startTime, upcomingEvents[0].endTime) : 'No upcoming event yet' },
    { label: 'Posts', value: String(posts.length), hint: posts[0]?.createdAt ? `Latest ${formatTimestamp(posts[0].createdAt)}` : 'No timeline posts yet' },
    {
      label: 'Certificates',
      value: String(manageable ? clubCertificates.length : myClubCertificates.length),
      hint: manageable ? 'Club-issued records' : 'Your club certificates'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/clubs" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
          <ChevronLeft className="size-4" />
          Back to clubs
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">{club.category}</span>
          {manageable ? <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100">Management active</span> : null}
          {joined ? <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-indigo-100">Member</span> : null}
        </div>
      </div>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-white shadow-glass">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{club.category}</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">{club.name}</h1>
              <p className="mt-3 max-w-2xl text-base text-white/75">{club.description || 'This club description has not been filled in yet.'}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-white/65">
              <span className="rounded-full border border-white/10 px-3 py-2">MIC · {club.mic}</span>
              <span className="rounded-full border border-white/10 px-3 py-2">{club.schedule}</span>
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
            <button
              type="button"
              onClick={() => (joined ? leaveClub(club.id) : joinClub(club.id))}
              className={clsx(
                'rounded-2xl px-5 py-3 text-sm font-medium transition',
                joined ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'
              )}
            >
              {joined ? 'Leave club' : 'Join club'}
            </button>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/70">
              {manageable
                ? 'This club page is your operational workspace for events, attendance, imports, and certificate issuance.'
                : joined
                  ? 'You are a member. Use the tabs below for the club timeline, events, and your certificate history.'
                  : 'Membership is currently open. Join the club to keep it on your profile and RSVP from the calendar.'}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {tabMeta.map((tab) => {
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

      <div className={clsx('grid gap-6', manageable ? 'xl:grid-cols-[minmax(0,1.5fr)_380px]' : 'grid-cols-1')}>
        <section className="space-y-4">
          {activeTab === 'about' ? (
            <AboutTab club={club} joined={joined} upcomingEvents={upcomingEvents} manageable={manageable} />
          ) : null}
          {activeTab === 'posts' ? (
            <PostsTab posts={posts} posting={posting} userName={user?.name} onSubmit={handlePost} />
          ) : null}
          {activeTab === 'events' ? (
            <EventsTab events={clubEvents} rsvps={rsvps} onRsvp={toggleRsvp} manageable={manageable} />
          ) : null}
          {activeTab === 'members' ? (
            <MembersTab club={club} users={clubUsers} manageable={manageable} loading={loadingManagement} />
          ) : null}
          {activeTab === 'certificates' ? (
            <CertificatesTab
              manageable={manageable}
              loading={loadingManagement}
              clubCertificates={clubCertificates}
              myCertificates={myClubCertificates}
            />
          ) : null}
        </section>

        {manageable ? (
          <ClubManagementPanel
            club={club}
            users={clubUsers}
            events={clubEvents}
            certificates={clubCertificates}
            attendance={attendance}
            attendanceEventId={attendanceEventId}
            attendanceLoading={loadingAttendance}
            onSelectAttendanceEvent={setAttendanceEventId}
            onSaveEvent={saveEvent}
            onRefresh={refreshClubData}
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
  joined,
  upcomingEvents,
  manageable
}: {
  club: Club;
  joined: boolean;
  upcomingEvents: EventRecord[];
  manageable: boolean;
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
            <h2 className="text-xl font-semibold text-white">Working rhythm</h2>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <span className="text-white/45">Schedule</span>
                <span className="text-right text-white">{club.schedule}</span>
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <span className="text-white/45">MIC</span>
                <span className="text-right text-white">{club.mic}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/45">Membership model</span>
                <span className="text-right text-white">Open self-serve membership in this build</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Membership</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{joined ? 'You are in this club' : 'Join to stay attached to the club'}</h2>
          <p className="mt-3 text-sm text-white/70">
            {joined
              ? 'Your profile already reflects this membership. Use the events tab to RSVP and the certificates tab to review issued records.'
              : 'Joining adds the club to your profile immediately. Pending approval queues are not wired in this pass, so the UI stays truthful about that.'}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Operations</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{manageable ? 'You manage this club here' : 'Club operations stay club-scoped'}</h2>
          <p className="mt-3 text-sm text-white/70">
            {manageable
              ? 'Use the operations rail for event editing, attendance review, imports, and certificate issuance without leaving the club page.'
              : 'Admin-only global tools exist elsewhere, but club-scoped workflows now live on this page rather than disappearing into the admin panel.'}
          </p>
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
                    {event.type}
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
  posting,
  userName,
  onSubmit
}: {
  posts: ClubPost[];
  posting: boolean;
  userName?: string;
  onSubmit: (text: string) => Promise<void> | void;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Timeline</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Posts and updates</h2>
        </div>
        <span className="text-sm text-white/60">{userName ? `Posting as ${userName}` : 'Sign in to post'}</span>
      </div>
      <PostComposer onSubmit={onSubmit} disabled={posting} />
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">No updates yet. The first post here becomes the club timeline anchor.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <p className="text-sm leading-7 text-white/85">{post.text}</p>
              <div className="mt-3 text-xs text-white/50">
                {post.authorName ?? 'Member'} • {formatTimestamp(post.createdAt, 'Just now')}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function EventsTab({
  events,
  rsvps,
  onRsvp,
  manageable
}: {
  events: EventRecord[];
  rsvps: Record<string, boolean>;
  onRsvp: (eventId: string, attending: boolean) => Promise<void>;
  manageable: boolean;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Events</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Club calendar and activity</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-white/60">
          {manageable ? 'Edit and attendance tools stay in the operations rail.' : 'RSVP here or use the full calendar for a wider view.'}
        </div>
      </div>
      {events.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">No club events have been created yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} attending={rsvps[event.id]} onRsvp={onRsvp} />
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
  loading
}: {
  club: Club;
  users: AppUser[];
  manageable: boolean;
  loading: boolean;
}) {
  if (!manageable) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-glass">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Members</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Membership is live, directory access is scoped</h2>
        <p className="mt-3 text-sm text-white/70">
          This club currently has {club.memberCount} member{club.memberCount === 1 ? '' : 's'}. The full roster is visible on the management side of the page for club coordinators and admins.
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
          Open membership is live. Approval queues are not wired.
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">Loading roster…</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-white/60">No member profiles are available yet.</div>
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
                {member.clubsJoined.includes(club.id) ? 'Active member profile' : 'Club management access'}
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

function PostComposer({ onSubmit, disabled }: { onSubmit: (text: string) => Promise<void> | void; disabled: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 md:flex-row">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Share an update with the club timeline"
        className="min-h-24 flex-1 rounded-2xl border border-white/10 bg-transparent px-3 py-3 text-white outline-none focus:border-accent"
      />
      <button
        type="button"
        disabled={!value.trim() || disabled}
        onClick={async () => {
          const nextValue = value.trim();
          if (!nextValue) return;
          await onSubmit(nextValue);
          setValue('');
        }}
        className={clsx(
          'rounded-2xl px-4 py-3 font-medium transition md:self-start',
          disabled || !value.trim() ? 'bg-white/10 text-white/50' : 'bg-indigo-500 text-white hover:bg-indigo-600'
        )}
      >
        {disabled ? 'Posting…' : 'Post update'}
      </button>
    </div>
  );
}

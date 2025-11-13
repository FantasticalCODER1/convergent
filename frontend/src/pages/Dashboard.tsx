import { useMemo } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';
import { useCertificates } from '../hooks/useCertificates';

const statCards = [
  { key: 'clubs', label: 'Clubs', accent: 'from-indigo-500 to-purple-500' },
  { key: 'events', label: 'Upcoming Events', accent: 'from-blue-500 to-cyan-500' },
  { key: 'certificates', label: 'Your Certificates', accent: 'from-emerald-500 to-lime-500' }
] as const;

export default function Dashboard() {
  const { user } = useAuth();
  const { clubs, loading: clubsLoading } = useClubs();
  const { events, loading: eventsLoading, toggleRsvp, rsvps } = useEvents();
  const { certificates, loading: certsLoading } = useCertificates();

  const counts = {
    clubs: clubs.length,
    events: events.length,
    certificates: certificates.length
  };

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    events.forEach((event) => {
      if (!event.startTime) return;
      const key = format(new Date(event.startTime), 'MMM');
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([month, value]) => ({ month, value }));
  }, [events]);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.startTime && new Date(event.startTime).getTime() >= Date.now())
        .slice(0, 3),
    [events]
  );

  const loading = clubsLoading || eventsLoading || certsLoading;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Overview</p>
        <h1 className="text-3xl font-semibold text-white">Welcome back, {user?.name ?? 'Student'}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card, index) => (
          <motion.div
            key={card.key}
            className="rounded-3xl border border-white/5 bg-white/5 p-5 shadow-glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <p className="text-sm text-white/60">{card.label}</p>
            <p className="text-4xl font-semibold text-white">{loading ? '—' : counts[card.key as keyof typeof counts] ?? 0}</p>
            <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${card.accent}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/50">Activity</p>
              <h2 className="text-xl font-semibold text-white">Events per month</h2>
            </div>
            {!eventsLoading && chartData.length === 0 && <span className="text-sm text-white/60">No events yet</span>}
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', color: '#fff' }} />
                <Area type="monotone" dataKey="value" stroke="#a5b4fc" fillOpacity={1} fill="url(#colorEvents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Upcoming</p>
          {eventsLoading ? (
            <div className="py-10 text-white/60">Loading events…</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="py-10 text-white/60">No upcoming events scheduled.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} attending={rsvps[event.id]} onRsvp={toggleRsvp} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

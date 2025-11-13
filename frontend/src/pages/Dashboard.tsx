import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { data } from '../data';
import type { EventDoc } from '../data/DataProvider';
import { useAuth } from '../context/AuthContext';

type EventRecord = {
  id: string;
  title: string;
  start: Date | null;
  type?: string;
};

type Counts = {
  clubs: number;
  events: number;
  certificates: number;
};

const statCards = [
  { key: 'clubs', label: 'Clubs', accent: 'from-indigo-500 to-purple-500' },
  { key: 'events', label: 'Upcoming Events', accent: 'from-blue-500 to-cyan-500' },
  { key: 'certificates', label: 'Your Certificates', accent: 'from-emerald-500 to-lime-500' }
] as const;

export default function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts>({ clubs: 0, events: 0, certificates: 0 });
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [clubs, events, certs] = await Promise.all([
          data.listClubs(),
          data.listEvents(),
          user ? data.listCertsForUser(user.id) : Promise.resolve([])
        ]);

        if (!isMounted) return;

        setCounts({ clubs: clubs.length, events: events.length, certificates: certs.length });
        setEvents(
          events
            .map((event) => ({
              id: event.id,
              title: event.title,
              type: event.type,
              start: toDate(event.start)
            }))
            .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0))
        );
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return events.find((event) => event.start && event.start.getTime() >= now);
  }, [events]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    events.forEach((event) => {
      if (!event.start) return;
      const key = format(event.start, 'MMM');
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([month, value]) => ({ month, value }));
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Overview</p>
        <h1 className="text-3xl font-semibold text-white">Welcome back, {user?.name ?? 'Student'}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <motion.div
            key={card.key}
            className="rounded-3xl border border-white/5 bg-white/5 p-5 shadow-glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * statCards.indexOf(card) }}
          >
            <p className="text-sm text-white/60">{card.label}</p>
            <p className="text-4xl font-semibold text-white">
              {loading ? '—' : counts[card.key as keyof Counts] ?? 0}
            </p>
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
            {!loading && chartData.length === 0 ? (
              <span className="text-sm text-white/60">No events yet</span>
            ) : null}
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
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Next event</p>
          {loading ? (
            <div className="py-10 text-white/60">Loading event timeline…</div>
          ) : nextEvent ? (
            <div className="mt-4 space-y-2">
              <h3 className="text-2xl font-semibold">{nextEvent.title}</h3>
              {nextEvent.start && (
                <p className="text-white/70">{format(nextEvent.start, 'EEEE, dd MMM • hh:mm a')}</p>
              )}
              {nextEvent.type && <p className="text-sm text-white/60">Type · {nextEvent.type}</p>}
            </div>
          ) : (
            <div className="py-10 text-white/60">No upcoming events scheduled.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function toDate(value: EventDoc['start'] | Date | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

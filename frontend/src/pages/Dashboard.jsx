/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Dashboard page showing personalized overview with upcoming activities and quick actions.
// TODO: Embed analytics widgets and AI-generated summaries of club engagement.

import EventCard from '../components/EventCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const sampleEvents = [
    {
      id: '1',
      title: 'Robotics Club Weekly Build Session',
      date: 'Wed, 4:00 PM',
      location: 'Innovation Lab',
      description: 'Hands-on prototyping and preparation for inter-school competition.'
    },
    {
      id: '2',
      title: 'Choir Practice',
      date: 'Thu, 3:30 PM',
      location: 'Music Room',
      description: 'Rehearsal for Founders Day performance.'
    }
  ];

  return (
    <div className="space-y-6">
      <section className="from-brand/10 to-brand/20 shadow-soft rounded-3xl bg-gradient-to-r via-white p-6">
        <h2 className="text-accent text-2xl font-semibold">Hello, {user?.displayName || 'Student'}!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Here’s what’s coming up in your clubs this week. Keep an eye on events and announcements.
        </p>
      </section>

      <section>
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Upcoming Events</h3>
          <button className="text-brand hover:text-brand-dark text-sm font-semibold">View calendar</button>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {sampleEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      </section>
    </div>
  );
}

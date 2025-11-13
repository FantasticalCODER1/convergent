import { useState } from 'react';
import { useClubs } from '../hooks/useClubs';
import { useEvents } from '../hooks/useEvents';

const sampleClubs = [
  { name: 'AI Society', description: 'Applied machine learning projects and talks.', category: 'Technology', mic: 'Dr. Rao', schedule: 'Wed 4 PM' },
  { name: 'Eco Warriors', description: 'Campus sustainability and clean-up drives.', category: 'Service', mic: 'Ms. Flores', schedule: 'Sat 9 AM' },
  { name: 'Design Collective', description: 'UI/UX critiques and hackathons.', category: 'Creative', mic: 'Mr. Nguyen', schedule: 'Fri 3 PM' }
];

const sampleEvents = [
  {
    title: 'AI Demo Day',
    type: 'club' as const,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    location: 'Innovation Lab'
  },
  {
    title: 'Community Clean Up',
    type: 'school' as const,
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    location: 'Riverside Park'
  }
];

export default function DevSeed() {
  const [status, setStatus] = useState<string | null>(null);
  const { createClub } = useClubs({ autoLoad: false });
  const { saveEvent } = useEvents({ autoLoad: false });

  const seed = async () => {
    setStatus('Seeding data…');
    for (const club of sampleClubs) {
      await createClub({ ...club, managerIds: [], logoUrl: undefined });
    }
    for (const event of sampleEvents) {
      await saveEvent({
        ...event,
        description: 'Seeded event'
      });
    }
    setStatus('Seed complete');
  };

  return (
    <div className="space-y-4 rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-white">
      <h1 className="text-2xl font-semibold">Developer Seeds</h1>
      <p className="text-sm text-white/70">Populate Firestore with sample clubs and events.</p>
      <button className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20" onClick={seed}>
        Seed data
      </button>
      {status && <p className="text-xs text-white/60">{status}</p>}
    </div>
  );
}

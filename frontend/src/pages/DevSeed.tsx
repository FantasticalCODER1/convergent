import { useState } from 'react';
import { data } from '../data';

const sampleClubs = [
  { name: 'AI Society', desc: 'Applied machine learning projects and talks.', category: 'Technology', mic: 'Dr. Rao', schedule: 'Wed 4 PM' },
  { name: 'Eco Warriors', desc: 'Campus sustainability and clean-up drives.', category: 'Service', mic: 'Ms. Flores', schedule: 'Sat 9 AM' },
  { name: 'Design Collective', desc: 'UI/UX critiques and hackathons.', category: 'Creative', mic: 'Mr. Nguyen', schedule: 'Fri 3 PM' }
];

const sampleEvents = [
  { title: 'AI Demo Day', type: 'club', start: new Date().toISOString(), end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), location: 'Innovation Lab' },
  { title: 'Community Clean Up', type: 'school', start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), location: 'Riverside Park' }
];

export default function DevSeed() {
  const [status, setStatus] = useState<string | null>(null);

  const seed = async () => {
    setStatus('Seeding data…');
    for (const club of sampleClubs) {
      await data.createClub({ ...club, managers: [] });
    }
    for (const event of sampleEvents) {
      await data.createEvent({
        ...event,
        description: 'Seeded event',
        clubId: undefined
      });
    }
    setStatus('Seed complete');
  };

  return (
    <div className="space-y-4 rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-white">
      <h1 className="text-2xl font-semibold">Developer Seeds</h1>
      <p className="text-sm text-white/70">Populate IndexedDB with sample clubs and events.</p>
      <button className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20" onClick={seed}>
        Seed local data
      </button>
      {status && <p className="text-xs text-white/60">{status}</p>}
    </div>
  );
}

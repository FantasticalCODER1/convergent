/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Page listing all clubs available in the school with quick action CTA for managers.
// TODO: Add filtering, search, and AI-powered recommendations for new joiners.

import ClubCard from '../components/ClubCard.jsx';

export default function Clubs() {
  const sampleClubs = [
    {
      id: 'robotics',
      name: 'Robotics Club',
      frequency: 'Weekly • Wednesdays',
      masterInCharge: 'Mr. Sharma'
    },
    {
      id: 'choir',
      name: 'School Choir',
      frequency: 'Bi-weekly • Tuesdays & Thursdays',
      masterInCharge: 'Ms. Rao'
    },
    {
      id: 'debate',
      name: 'Debate Society',
      frequency: 'Weekly • Fridays',
      masterInCharge: 'Mr. Fernandes'
    }
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-accent">Clubs &amp; Societies</h2>
          <p className="text-sm text-slate-500">Discover all the co-curricular activities available this term.</p>
        </div>
        <button className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand transition duration-250 hover:bg-brand/10">
          Create club
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sampleClubs.map((club) => (
          <ClubCard key={club.id} {...club} />
        ))}
      </div>
    </div>
  );
}

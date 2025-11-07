/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Detailed view for an individual club covering overview, events, and posts.
// TODO: Integrate collaborative notes, attendance exports, and AI meeting recaps.

import { useParams } from 'react-router-dom';

export default function ClubDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold capitalize text-accent">{id?.replace('-', ' ')}</h2>
          <p className="text-sm text-slate-500">
            Overview of posts, events, and members for this club. Content will be dynamically loaded from Firestore.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand transition duration-250 hover:bg-brand/10">
            Join club
          </button>
          <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-dark">
            Manage
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-800">About</h3>
          <p className="mt-2 text-sm text-slate-600">
            This section will include the club description, mission, and key information tailored from the database.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-800">Upcoming Events</h3>
          <p className="mt-2 text-sm text-slate-600">Events and meetings scheduled by the club managers appear here.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-slate-800">Recent Posts</h3>
        <p className="mt-2 text-sm text-slate-600">
          Posts, announcements, and resources shared by club managers will be listed.
        </p>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { ClubDetails } from '../components/ClubDetails';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import type { Club } from '../types/Club';

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getClubById, joinClub, leaveClub, fetchPosts, submitPost, postsForClub } = useClubs();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const doc = await getClubById(id);
      setClub(doc ?? null);
      await fetchPosts(id);
      setLoading(false);
    })();
  }, [id, getClubById, fetchPosts]);

  if (!id) {
    return <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Club not found.</div>;
  }

  if (loading) {
    return <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Loading club…</div>;
  }

  if (!club) {
    return <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Club no longer exists.</div>;
  }

  const joined = (user?.clubsJoined ?? []).includes(club.id);
  const posts = postsForClub(club.id);

  const handlePost = async (text: string) => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await submitPost(club.id, text.trim());
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ClubDetails club={club} joined={joined} onJoin={() => joinClub(club.id)} onLeave={() => leaveClub(club.id)}>
        <div className="text-sm text-white/70">Managed by {club.managerIds.length || 0} coordinators.</div>
      </ClubDetails>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">Timeline</p>
            <h2 className="text-2xl font-semibold text-white">Latest posts</h2>
          </div>
          {user ? <span className="text-sm text-white/60">Posting as {user.name}</span> : <span className="text-sm text-white/60">Sign in to post</span>}
        </div>
        {user && <PostComposer onSubmit={handlePost} disabled={posting} />}
        <div className="space-y-3">
          {posts.length === 0 && <div className="rounded-2xl border border-white/5 bg-white/10 p-4 text-white/60">No posts yet.</div>}
          {posts.map((post) => (
            <motion.div key={post.id} className="rounded-2xl border border-white/5 bg-white/10 p-4 text-white" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm text-white/80">{post.text}</p>
              <div className="mt-2 text-xs text-white/50">
                {post.authorName ?? 'Member'} • {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Just now'}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PostComposer({ onSubmit, disabled }: { onSubmit: (text: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/10 p-4 md:flex-row">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Share an update"
        className="flex-1 rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-accent"
        rows={2}
      />
      <button
        type="button"
        disabled={!value.trim() || disabled}
        onClick={() => {
          onSubmit(value);
          setValue('');
        }}
        className={clsx(
          'rounded-2xl px-4 py-2 font-medium transition',
          disabled || !value.trim() ? 'bg-white/10 text-white/50' : 'bg-indigo-500 text-white hover:bg-indigo-600'
        )}
      >
        {disabled ? 'Posting…' : 'Post'}
      </button>
    </div>
  );
}

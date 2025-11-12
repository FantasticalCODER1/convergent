import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import clsx from 'clsx';

type ClubDoc = {
  id: string;
  name: string;
  desc: string;
  category: string;
  mic: string;
  schedule: string;
};

type Post = {
  id: string;
  text: string;
  authorUid: string;
  createdAt?: Date | null;
};

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const [club, setClub] = useState<ClubDoc | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [clubSnap, postsSnap] = await Promise.all([getDoc(doc(db, 'clubs', id)), loadPosts(id)]);
        if (cancelled) return;
        if (clubSnap.exists()) {
          setClub({ id: clubSnap.id, ...(clubSnap.data() as Omit<ClubDoc, 'id'>) });
        } else {
          setClub(null);
        }
        setPosts(postsSnap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePost = async (text: string) => {
    if (!id || !user || !text.trim()) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'clubPosts', id, 'posts'), {
        text: text.trim(),
        authorUid: user.uid,
        createdAt: serverTimestamp()
      });
      const updated = await loadPosts(id);
      setPosts(updated);
    } finally {
      setPosting(false);
    }
  };

  if (!id) {
    return <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Club not found.</div>;
  }

  if (loading) {
    return <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Loading club…</div>;
  }

  if (!club) {
    return <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Club no longer exists.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Club</p>
        <h1 className="text-3xl font-semibold text-white">{club.name}</h1>
        <p className="mt-4 text-white/70">{club.desc}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
          <Tag>Category · {club.category}</Tag>
          <Tag>MIC · {club.mic}</Tag>
          <Tag>Schedule · {club.schedule}</Tag>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">Timeline</p>
            <h2 className="text-2xl font-semibold text-white">Latest posts</h2>
          </div>
          {user ? (
            <span className="text-sm text-white/60">Posting as {user.name}</span>
          ) : (
            <span className="text-sm text-white/60">Sign in to post</span>
          )}
        </div>
        {user && <PostComposer onSubmit={handlePost} disabled={posting} />}
        <div className="space-y-3">
          {posts.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/10 p-4 text-white/60">No posts yet.</div>
          )}
          {posts.map((post) => (
            <motion.div
              key={post.id}
              className="rounded-2xl border border-white/5 bg-white/10 p-4 text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p>{post.text}</p>
              {post.createdAt && (
                <p className="mt-2 text-xs text-white/50">{post.createdAt.toLocaleString()}</p>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 px-3 py-1">{children}</span>;
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

async function loadPosts(clubId: string) {
  const q = query(collection(db, 'clubPosts', clubId, 'posts'), orderBy('createdAt', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, any>;
    return {
      id: docSnap.id,
      text: data.text ?? '',
      authorUid: data.authorUid ?? '',
      createdAt:
        data.createdAt instanceof Date
          ? data.createdAt
          : data.createdAt?.toDate
            ? data.createdAt.toDate()
            : null
    };
  });
}

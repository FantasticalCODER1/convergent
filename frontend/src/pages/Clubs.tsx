import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { data } from '../data';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  name: z.string().min(3, 'Club name should be at least 3 characters'),
  desc: z.string().min(10, 'Add a short description (10+ chars)'),
  category: z.string().min(2, 'Category required'),
  mic: z.string().min(3, 'MIC required'),
  schedule: z.string().min(2, 'Schedule required')
});

type ClubForm = z.infer<typeof schema>;

export default function Clubs() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const canManage = user && ['admin', 'teacher'].includes(user.role);

  const fetchClubs = async () => {
    try {
      const items = await data.listClubs();
      setClubs(items.sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">Communities</p>
          <h1 className="text-3xl font-semibold text-white">Clubs & Societies</h1>
          <p className="text-white/60">Discover, join, and manage vibrant student communities.</p>
        </div>
        {canManage ? <CreateClubForm onCreated={fetchClubs} /> : null}
      </header>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">Loading clubs…</div>
      ) : clubs.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70 shadow-glass">
          No clubs yet. Be the first to create one!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club, index) => (
            <motion.div
              key={club.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/clubs/${club.id}`}
                className="block rounded-3xl border border-white/5 bg-white/5 p-5 shadow-glass transition hover:bg-white/10"
              >
                <h3 className="text-xl font-semibold text-white">{club.name}</h3>
                <p className="mt-2 text-sm text-white/70">{club.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
                  <span className="rounded-full border border-white/10 px-3 py-1">{club.category}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">MIC {club.mic}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">{club.schedule}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateClubForm({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ClubForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: ClubForm) => {
    await data.createClub({
      ...values,
      managers: user ? [user.id] : []
    });
    reset();
    await onCreated();
  };

  const firstError = Object.values(errors)[0]?.message;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="glass-card flex flex-col gap-3 rounded-2xl p-4 text-sm md:flex-row md:items-end"
    >
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs uppercase tracking-[0.2em] text-white/60">Name</label>
        <input
          {...register('name')}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent"
          placeholder="AI Club"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs uppercase tracking-[0.2em] text-white/60">Description</label>
        <input
          {...register('desc')}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent"
          placeholder="Build and learn together"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs uppercase tracking-[0.2em] text-white/60">Category</label>
        <input
          {...register('category')}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent"
          placeholder="Tech"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs uppercase tracking-[0.2em] text-white/60">MIC</label>
        <input
          {...register('mic')}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent"
          placeholder="Dr. Smith"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs uppercase tracking-[0.2em] text-white/60">Schedule</label>
        <input
          {...register('schedule')}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent"
          placeholder="Wednesdays"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-2xl bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
      >
        {isSubmitting ? 'Adding…' : 'Add'}
      </button>
      {firstError && <span className="text-sm text-rose-300 md:w-40">{firstError}</span>}
    </form>
  );
}

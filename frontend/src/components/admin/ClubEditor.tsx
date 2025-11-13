import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { createClub } from '../../services/clubsService';
import type { CreateClubInput } from '../../services/clubsService';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  mic: z.string().min(2),
  schedule: z.string().min(2)
});

type FormValues = z.infer<typeof schema>;

export function ClubEditor({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', category: '', mic: '', schedule: '' }
  });

  const submit = async (values: FormValues) => {
    if (!user) {
      setStatus('Sign in to create clubs.');
      return;
    }
    setStatus(null);
    const payload: CreateClubInput = {
      name: values.name,
      description: values.description,
      category: values.category,
      mic: values.mic,
      schedule: values.schedule,
      managerIds: [user.id],
      memberCount: 0,
      logoUrl: undefined
    };
    await createClub(payload, user);
    reset();
    setStatus('Club saved.');
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Create club</p>
        <p className="text-sm text-white/60">Set up a new club record.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Name</span>
          <input {...register('name')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          {errors.name && <span className="text-xs text-rose-300">{errors.name.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Category</span>
          <input {...register('category')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          {errors.category && <span className="text-xs text-rose-300">{errors.category.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">MIC</span>
          <input {...register('mic')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          {errors.mic && <span className="text-xs text-rose-300">{errors.mic.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Schedule</span>
          <input {...register('schedule')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          {errors.schedule && <span className="text-xs text-rose-300">{errors.schedule.message}</span>}
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-white/70">Description</span>
        <textarea {...register('description')} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
        {errors.description && <span className="text-xs text-rose-300">{errors.description.message}</span>}
      </label>
      <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-60">
        {isSubmitting ? 'Saving…' : 'Save club'}
      </button>
      {status && <p className="text-xs text-white/60">{status}</p>}
    </form>
  );
}

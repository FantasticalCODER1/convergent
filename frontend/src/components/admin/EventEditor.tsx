import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { EventKind } from '../../types/Event';

const schema = z.object({
  title: z.string().min(3),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['club', 'school', 'competition']),
  description: z.string().optional()
});

export type EventEditorValues = z.infer<typeof schema>;

type Props = {
  onSave: (payload: { title: string; description?: string; startTime: string; endTime: string; location?: string; type: EventKind }) => Promise<void> | void;
};

export function EventEditor({ onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors }
  } = useForm<EventEditorValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '17:00',
      type: 'club'
    }
  });

  const submit = async (values: EventEditorValues) => {
    const startIso = new Date(`${values.date}T${values.startTime}`).toISOString();
    const endIso = values.endTime ? new Date(`${values.date}T${values.endTime}`).toISOString() : startIso;
    await onSave({
      title: values.title,
      description: values.description || undefined,
      startTime: startIso,
      endTime: endIso,
      location: values.location || undefined,
      type: values.type
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Add event</p>
        <p className="text-sm text-white/60">Schedule manual events.</p>
      </div>
      <label className="space-y-1 text-sm">
        <span>Title</span>
        <input {...register('title')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
        {errors.title && <span className="text-xs text-rose-300">{errors.title.message}</span>}
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span>Date</span>
          <input type="date" {...register('date')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Start time</span>
          <input type="time" {...register('startTime')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>End time</span>
          <input type="time" {...register('endTime')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span>Location</span>
        <input {...register('location')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <label className="space-y-1 text-sm">
        <span>Type</span>
        <select {...register('type')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-black">
          <option value="club">Club</option>
          <option value="school">School</option>
          <option value="competition">Competition</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>Description</span>
        <textarea {...register('description')} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-60">
        {isSubmitting ? 'Saving…' : 'Create event'}
      </button>
    </form>
  );
}

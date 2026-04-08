import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { EventKind, EventRecord } from '../../types/Event';

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
  title?: string;
  description?: string;
  event?: EventRecord | null;
  allowedTypes?: EventKind[];
  onSave: (payload: {
    id?: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    type: EventKind;
    clubId?: string;
  }) => Promise<void> | void;
  clubId?: string;
  onCancelEdit?: () => void;
};

function toEditorValues(event?: EventRecord | null): EventEditorValues {
  if (!event) {
    return {
      title: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '17:00',
      type: 'club'
    };
  }
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return {
    title: event.title,
    description: event.description,
    date: start.toISOString().split('T')[0],
    startTime: start.toISOString().slice(11, 16),
    endTime: end.toISOString().slice(11, 16),
    location: event.location,
    type: event.type
  };
}

export function EventEditor({
  onSave,
  event,
  clubId,
  onCancelEdit,
  title = 'Event manager',
  description = 'Create or update events for this management scope.',
  allowedTypes = ['club', 'school', 'competition']
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors }
  } = useForm<EventEditorValues>({
    resolver: zodResolver(schema),
    defaultValues: toEditorValues(event)
  });

  useEffect(() => {
    reset(toEditorValues(event));
  }, [event, reset]);

  const submit = async (values: EventEditorValues) => {
    const startIso = new Date(`${values.date}T${values.startTime}`).toISOString();
    const endIso = values.endTime ? new Date(`${values.date}T${values.endTime}`).toISOString() : startIso;
    await onSave({
      id: event?.id,
      title: values.title,
      description: values.description || undefined,
      startTime: startIso,
      endTime: endIso,
      location: values.location || undefined,
      type: values.type,
      clubId
    });
    reset(toEditorValues(null));
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{event ? 'Edit event' : 'Add event'}</p>
        <p className="text-sm text-white/60">{title}</p>
        <p className="text-xs text-white/50">{description}</p>
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
          {allowedTypes.map((type) => (
            <option key={type} value={type}>
              {type[0].toUpperCase()}
              {type.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>Description</span>
        <textarea {...register('description')} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-60">
          {isSubmitting ? 'Saving…' : event ? 'Save event' : 'Create event'}
        </button>
        {event && onCancelEdit ? (
          <button type="button" onClick={onCancelEdit} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10">
            Cancel edit
          </button>
        ) : null}
      </div>
    </form>
  );
}

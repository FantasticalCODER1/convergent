import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CONVERGENT_CATEGORIES, type ConvergentCategoryKey } from '../../domain/categories';
import type { EventRecord } from '../../types/Event';

const schema = z.object({
  title: z.string().min(3),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  category: z.enum(CONVERGENT_CATEGORIES.map((category) => category.key) as [ConvergentCategoryKey, ...ConvergentCategoryKey[]]),
  scope: z.enum(['school', 'group', 'academic']),
  classroomLink: z.string().optional(),
  classroomCourseId: z.string().optional(),
  classroomPostLink: z.string().optional(),
  meetLink: z.string().optional(),
  resourceLinks: z.string().optional(),
  description: z.string().optional(),
  attendanceEnabled: z.boolean().default(true)
});

export type EventEditorValues = z.infer<typeof schema>;

type Props = {
  title?: string;
  description?: string;
  event?: EventRecord | null;
  allowedCategories?: ConvergentCategoryKey[];
  onSave: (payload: {
    id?: string;
    title: string;
    description?: string;
    category: ConvergentCategoryKey;
    scope: EventRecord['scope'];
    relatedGroupId?: string;
    startTime: string;
    endTime: string;
    allDay?: boolean;
    location?: string;
    classroomLink?: string;
    classroomCourseId?: string;
    classroomPostLink?: string;
    meetLink?: string;
    resourceLinks?: EventRecord['resourceLinks'];
    attendanceEnabled?: boolean;
  }) => Promise<void> | void;
  relatedGroupId?: string;
  lockedScope?: EventRecord['scope'];
  onCancelEdit?: () => void;
};

function toEditorValues(event?: EventRecord | null): EventEditorValues {
  if (!event) {
    return {
      title: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '17:00',
      category: 'club',
      scope: 'group',
      attendanceEnabled: true
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
    category: event.category,
    scope: event.scope,
    classroomLink: event.classroomLink ?? undefined,
    classroomCourseId: event.classroomCourseId ?? undefined,
    classroomPostLink: event.classroomPostLink ?? undefined,
    meetLink: event.meetLink ?? undefined,
    resourceLinks: event.resourceLinks.map((link) => link.url).join('\n'),
    attendanceEnabled: event.attendanceEnabled
  };
}

function parseResourceLinks(value?: string) {
  return String(value ?? '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((url, index) => ({
      label: `Resource ${index + 1}`,
      url,
      kind: 'resource' as const
    }));
}

export function EventEditor({
  onSave,
  event,
  relatedGroupId,
  lockedScope,
  onCancelEdit,
  title = 'Event manager',
  description = 'Create or update events for this management scope.',
  allowedCategories = ['school_wide', 'academic', 'club', 'society', 'supw', 'sta', 'centre_of_excellence', 'meals']
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
      category: values.category,
      scope: lockedScope ?? values.scope,
      relatedGroupId,
      startTime: startIso,
      endTime: endIso,
      location: values.location || undefined,
      classroomLink: values.classroomLink || undefined,
      classroomCourseId: values.classroomCourseId || undefined,
      classroomPostLink: values.classroomPostLink || undefined,
      meetLink: values.meetLink || undefined,
      resourceLinks: parseResourceLinks(values.resourceLinks),
      attendanceEnabled: values.attendanceEnabled
    });
    reset(toEditorValues(null));
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{event ? 'Edit event' : 'Add event'}</p>
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
      <label className="space-y-1 text-sm">
        <span>Title</span>
        <input {...register('title')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
        {errors.title && <span className="text-xs text-rose-300">{errors.title.message}</span>}
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span>Date</span>
          <input type="date" {...register('date')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Start time</span>
          <input type="time" {...register('startTime')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>End time</span>
          <input type="time" {...register('endTime')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span>Location</span>
        <input {...register('location')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Category</span>
          <select {...register('category')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white">
            {CONVERGENT_CATEGORIES.filter((category) => allowedCategories.includes(category.key)).map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        {lockedScope ? (
          <div className="space-y-1 text-sm">
            <span>Scope</span>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white/75">
              {lockedScope === 'group' ? 'Group scoped' : lockedScope === 'school' ? 'School-wide' : 'Academic'}
            </div>
          </div>
        ) : (
          <label className="space-y-1 text-sm">
            <span>Scope</span>
            <select {...register('scope')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white">
              <option value="school">School-wide</option>
              <option value="group">Group scoped</option>
              <option value="academic">Academic</option>
            </select>
          </label>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Classroom link</span>
          <input {...register('classroomLink')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Classroom course id</span>
          <input {...register('classroomCourseId')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Classroom post link</span>
          <input {...register('classroomPostLink')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Meet link</span>
          <input {...register('meetLink')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span>Description</span>
        <textarea {...register('description')} rows={3} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
      </label>
      <label className="space-y-1 text-sm">
        <span>Resource links</span>
        <textarea
          {...register('resourceLinks')}
          rows={3}
          placeholder="One URL per line"
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-white/75">
        <input type="checkbox" {...register('attendanceEnabled')} />
        Track attendance through RSVP
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

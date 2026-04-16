import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { GROUP_CATEGORY_KEYS, getCategoryMeta } from '../../domain/categories';
import { saveClub } from '../../services/clubsService';
import type { CreateClubInput } from '../../services/clubsService';
import { useAuth } from '../../hooks/useAuth';
import type { Club } from '../../types/Club';

const schema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(GROUP_CATEGORY_KEYS as [typeof GROUP_CATEGORY_KEYS[number], ...typeof GROUP_CATEGORY_KEYS[number][]]),
  mic: z.string().min(2),
  schedule: z.string().min(2),
  meetingLocation: z.string().optional(),
  logoUrl: z.string().optional(),
  classroomLink: z.string().optional(),
  classroomCode: z.string().optional(),
  classroomCourseId: z.string().optional(),
  defaultMeetLink: z.string().optional(),
  resourceLinks: z.string().optional(),
  visibility: z.enum(['school', 'members', 'managers', 'private']).default('school'),
  membershipMode: z.enum(['open', 'approval_required', 'invite_only']).default('open'),
  managerIds: z.string().optional(),
  memberCount: z.coerce.number().min(0).default(0)
});

type FormValues = z.infer<typeof schema>;

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

function toFormValues(club?: Club | null): FormValues {
  if (!club) {
    return {
      name: '',
      description: '',
      category: 'club',
      mic: '',
      schedule: '',
      meetingLocation: '',
      logoUrl: '',
      classroomLink: '',
      classroomCode: '',
      classroomCourseId: '',
      defaultMeetLink: '',
      resourceLinks: '',
      visibility: 'school',
      membershipMode: 'open',
      managerIds: '',
      memberCount: 0
    };
  }

  return {
    name: club.name,
    description: club.description,
    category: club.category,
    mic: club.mic,
    schedule: club.schedule,
    meetingLocation: club.meetingLocation ?? '',
    logoUrl: club.logoUrl ?? '',
    classroomLink: club.classroomLink ?? '',
    classroomCode: club.classroomCode ?? '',
    classroomCourseId: club.classroomCourseId ?? '',
    defaultMeetLink: club.defaultMeetLink ?? club.meetLink ?? '',
    resourceLinks: club.resourceLinks.map((link) => link.url).join('\n'),
    visibility: club.visibility ?? 'school',
    membershipMode: club.membershipMode ?? 'open',
    managerIds: club.managerIds.join('\n'),
    memberCount: club.memberCount ?? 0
  };
}

export function ClubEditor({
  club,
  onCreated,
  mode = 'admin'
}: {
  club?: Club | null;
  onCreated?: () => void;
  mode?: 'admin' | 'manager';
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const adminMode = mode === 'admin';
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(
      adminMode
        ? schema
        : schema.pick({
            description: true,
            schedule: true,
            meetingLocation: true
          })
    ),
    defaultValues: toFormValues(club)
  });

  useEffect(() => {
    reset(toFormValues(club));
  }, [club, reset]);

  const submit = async (values: FormValues) => {
    if (!user) {
      setStatus('Sign in to create clubs.');
      return;
    }
    setStatus(null);
    const payload: Record<string, unknown> & { id?: string } = adminMode
      ? {
          id: club?.id,
          name: values.name,
          description: values.description,
          category: values.category,
          groupType: values.category as CreateClubInput['groupType'],
          mic: values.mic,
          schedule: values.schedule,
          meetingLocation: values.meetingLocation || null,
          managerIds: values.managerIds
            ? values.managerIds.split('\n').map((entry) => entry.trim()).filter(Boolean)
            : (club?.managerIds ?? [user.id]),
          memberCount: values.memberCount,
          logoUrl: values.logoUrl || null,
          classroomLink: values.classroomLink || null,
          classroomCode: values.classroomCode || null,
          classroomCourseId: values.classroomCourseId || null,
          defaultMeetLink: values.defaultMeetLink || null,
          meetLink: values.defaultMeetLink || null,
          resourceLinks: parseResourceLinks(values.resourceLinks),
          visibility: values.visibility,
          membershipMode: values.membershipMode
        }
      : {
          id: club?.id,
          description: values.description,
          schedule: values.schedule,
          meetingLocation: values.meetingLocation || null
        };
    await saveClub(payload, user);
    reset(toFormValues(club));
    setStatus(club ? 'Club updated.' : 'Club saved.');
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{club ? 'Edit club' : 'Create club'}</p>
        <p className="text-lg font-semibold text-white">{club ? `Update ${club.name}` : 'Set up a new club record'}</p>
        <p className="text-sm text-white/60">
          {adminMode
            ? club
              ? 'Admin edits can change both public club metadata and authority-sensitive settings.'
              : 'Global creation stays here. Day-to-day club operations now live on each club page.'
            : 'Manager edits are limited to the club description, meeting schedule, and location. Authority-sensitive settings stay admin-owned.'}
        </p>
      </div>
      {adminMode ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Name</span>
              <input {...register('name')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
              {errors.name && <span className="text-xs text-rose-300">{errors.name.message}</span>}
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Category</span>
              <select {...register('category')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white">
                {GROUP_CATEGORY_KEYS.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryMeta(category).label}
                  </option>
                ))}
              </select>
              {errors.category && <span className="text-xs text-rose-300">{errors.category.message}</span>}
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">MIC</span>
              <input {...register('mic')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
              {errors.mic && <span className="text-xs text-rose-300">{errors.mic.message}</span>}
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Schedule</span>
              <input {...register('schedule')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
              {errors.schedule && <span className="text-xs text-rose-300">{errors.schedule.message}</span>}
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Meeting location</span>
              <input {...register('meetingLocation')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Logo URL</span>
              <input {...register('logoUrl')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Classroom link</span>
              <input {...register('classroomLink')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Classroom code</span>
              <input {...register('classroomCode')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Classroom course id</span>
              <input {...register('classroomCourseId')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Default Meet link</span>
              <input {...register('defaultMeetLink')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Visibility</span>
              <select {...register('visibility')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white">
                <option value="school">School-visible</option>
                <option value="members">Members only</option>
                <option value="managers">Managers only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Membership mode</span>
              <select {...register('membershipMode')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white">
                <option value="open">Open</option>
                <option value="approval_required">Approval required</option>
                <option value="invite_only">Invite only</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Member count</span>
              <input type="number" min="0" {...register('memberCount', { valueAsNumber: true })} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Manager ids</span>
            <textarea {...register('managerIds')} rows={3} placeholder="One uid per line" className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
          </label>
        </>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Schedule</span>
            <input {...register('schedule')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            {errors.schedule && <span className="text-xs text-rose-300">{errors.schedule.message}</span>}
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Meeting location</span>
            <input {...register('meetingLocation')} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
          </label>
        </div>
      )}
      <label className="space-y-1 text-sm">
        <span className="text-white/70">Description</span>
        <textarea {...register('description')} rows={3} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
        {errors.description && <span className="text-xs text-rose-300">{errors.description.message}</span>}
      </label>
      {adminMode ? (
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Resource links</span>
          <textarea {...register('resourceLinks')} rows={3} placeholder="One URL per line" className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
        </label>
      ) : null}
      <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-60">
        {isSubmitting ? 'Saving…' : club ? 'Save club changes' : 'Save club'}
      </button>
      {status && <p className="text-xs text-white/60">{status}</p>}
    </form>
  );
}

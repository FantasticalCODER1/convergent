import { useState } from 'react';
import clsx from 'clsx';
import { CONVERGENT_CATEGORIES, GROUP_CATEGORY_KEYS, type ConvergentCategoryKey } from '../../domain/categories';

type Mode = 'post' | 'event' | 'post_event';

type Submission = {
  mode: Mode;
  title: string;
  content: string;
  category: ConvergentCategoryKey;
  event?: {
    title: string;
    description?: string;
    category: ConvergentCategoryKey;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    classroomLink?: string;
    classroomCourseId?: string;
    classroomPostLink?: string;
    meetLink?: string;
    resourceLinks: Array<{ label: string; url: string; kind: 'resource' }>;
    attendanceEnabled: boolean;
  };
};

type Props = {
  defaultCategory: ConvergentCategoryKey;
  onSubmit: (payload: Submission) => Promise<void> | void;
};

function parseResourceLinks(value: string) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((url, index) => ({
      label: `Resource ${index + 1}`,
      url,
      kind: 'resource' as const
    }));
}

export function ClubContentComposer({ defaultCategory, onSubmit }: Props) {
  const [mode, setMode] = useState<Mode>('post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ConvergentCategoryKey>(GROUP_CATEGORY_KEYS.includes(defaultCategory) ? defaultCategory : 'club');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [classroomLink, setClassroomLink] = useState('');
  const [classroomCourseId, setClassroomCourseId] = useState('');
  const [classroomPostLink, setClassroomPostLink] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [resourceLinks, setResourceLinks] = useState('');
  const [attendanceEnabled, setAttendanceEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const needsEventFields = mode === 'event' || mode === 'post_event';

  const reset = () => {
    setMode('post');
    setTitle('');
    setContent('');
    setCategory(GROUP_CATEGORY_KEYS.includes(defaultCategory) ? defaultCategory : 'club');
    setDate(new Date().toISOString().slice(0, 10));
    setStartTime('16:00');
    setEndTime('17:00');
    setLocation('');
    setClassroomLink('');
    setClassroomCourseId('');
    setClassroomPostLink('');
    setMeetLink('');
    setResourceLinks('');
    setAttendanceEnabled(true);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Club publishing</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Create post, event, or both</h3>
        <p className="mt-2 text-sm text-white/60">Use one flow for official updates, event publishing, and posts linked to a scheduled meeting.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'post', label: 'Post only' },
          { id: 'event', label: 'Event only' },
          { id: 'post_event', label: 'Post + event' }
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id as Mode)}
            className={clsx(
              'rounded-full border px-4 py-2 text-sm transition',
              mode === option.id ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="block space-y-1 text-sm">
        <span>{mode === 'event' ? 'Event title' : 'Title'}</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as ConvergentCategoryKey)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white">
            {CONVERGENT_CATEGORIES.filter((categoryOption) => GROUP_CATEGORY_KEYS.includes(categoryOption.key)).map((categoryOption) => (
              <option key={categoryOption.key} value={categoryOption.key}>
                {categoryOption.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span>{mode === 'event' ? 'Event description' : 'Post body'}</span>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
      </label>

      {needsEventFields ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Start time</span>
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span>End time</span>
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span>Location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Classroom link</span>
              <input value={classroomLink} onChange={(event) => setClassroomLink(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Classroom course id</span>
              <input value={classroomCourseId} onChange={(event) => setClassroomCourseId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Classroom post link</span>
              <input value={classroomPostLink} onChange={(event) => setClassroomPostLink(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Meet link</span>
              <input value={meetLink} onChange={(event) => setMeetLink(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" placeholder="Optional" />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span>Resource links</span>
            <textarea value={resourceLinks} onChange={(event) => setResourceLinks(event.target.value)} rows={3} placeholder="One URL per line" className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-white/75">
            <input type="checkbox" checked={attendanceEnabled} onChange={(event) => setAttendanceEnabled(event.target.checked)} />
            Track attendance through RSVP
          </label>
        </>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={submitting || !title.trim() || !content.trim() || (needsEventFields && (!date || !startTime || !endTime))}
          onClick={async () => {
            if (!title.trim() || !content.trim()) return;
            setSubmitting(true);
            try {
              await onSubmit({
                mode,
                title: title.trim(),
                content: content.trim(),
                category,
                event: needsEventFields
                  ? {
                      title: title.trim(),
                      description: content.trim(),
                      category,
                      date,
                      startTime,
                      endTime,
                      location: location.trim() || undefined,
                      classroomLink: classroomLink.trim() || undefined,
                      classroomCourseId: classroomCourseId.trim() || undefined,
                      classroomPostLink: classroomPostLink.trim() || undefined,
                      meetLink: meetLink.trim() || undefined,
                      resourceLinks: parseResourceLinks(resourceLinks),
                      attendanceEnabled
                    }
                  : undefined
              });
              reset();
            } finally {
              setSubmitting(false);
            }
          }}
          className={clsx(
            'rounded-2xl px-4 py-2 text-sm font-medium transition',
            submitting || !title.trim() || !content.trim() || (needsEventFields && (!date || !startTime || !endTime))
              ? 'bg-white/10 text-white/45'
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
          )}
        >
          {submitting ? 'Saving…' : mode === 'post' ? 'Publish post' : mode === 'event' ? 'Create event' : 'Publish both'}
        </button>
      </div>
    </section>
  );
}

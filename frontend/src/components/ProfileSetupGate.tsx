import { useEffect, useState } from 'react';
import { PROFILE_GRADE_PLACEHOLDER, PROFILE_SECTION_PLACEHOLDER, getProfileCompletionLabel, isProfileComplete } from '../domain/profile';
import { updateOwnProfile } from '../services/usersService';
import type { AppUser } from '../types/User';

type Props = {
  user: AppUser | null;
  onComplete?: () => Promise<void> | void;
};

export function ProfileSetupGate({ user, onComplete }: Props) {
  const [grade, setGrade] = useState(user?.grade ?? '');
  const [section, setSection] = useState(user?.section ?? '');
  const [house, setHouse] = useState(user?.house ?? '');
  const [residency, setResidency] = useState<AppUser['residency']>(user?.residency);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGrade(user?.grade ?? '');
    setSection(user?.section ?? '');
    setHouse(user?.house ?? '');
    setResidency(user?.residency);
  }, [user?.grade, user?.section, user?.house, user?.residency]);

  if (!user || isProfileComplete(user)) {
    return null;
  }

  const submit = async () => {
    if (!grade.trim() || !section.trim()) {
      setError('Grade and section are required to personalise timetable data.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateOwnProfile(user.id, {
        grade: grade.trim(),
        section: section.trim(),
        house: house.trim() || undefined,
        residency
      });
      await onComplete?.();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Profile setup</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Finish your academic profile</h2>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Convergent now uses grade and section to map timetable datasets, meal views, and class-linked resources. This is stored on your profile and can be updated later.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white/65">
            Current state: {getProfileCompletionLabel(user)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-white/75">Grade</span>
            <input
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder={PROFILE_GRADE_PLACEHOLDER}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/75">Section / subgroup</span>
            <input
              value={section}
              onChange={(event) => setSection(event.target.value)}
              placeholder={PROFILE_SECTION_PLACEHOLDER}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/75">House</span>
            <input
              value={house}
              onChange={(event) => setHouse(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/75">Boarding / day</span>
            <select
              value={residency ?? ''}
              onChange={(event) => setResidency((event.target.value || undefined) as AppUser['residency'])}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white"
            >
              <option value="">Optional</option>
              <option value="boarding">Boarding</option>
              <option value="day">Day</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {saving ? 'Saving profile…' : 'Save profile'}
          </button>
          <p className="text-sm text-white/55">This is the minimum profile data needed to route you into timetable datasets later.</p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-x-4 bottom-24 z-40 flex justify-center md:bottom-6">
      <div className="w-full max-w-4xl rounded-[30px] border border-cyan-400/18 bg-[rgba(10,15,27,0.96)] p-5 text-[var(--text)] shadow-[0_30px_70px_rgba(3,8,22,0.42)] backdrop-blur">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.35em] text-[var(--accent-2)]">Profile setup</p>
        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-strong)]">Finish your academic profile</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
              Grade and section are only used to map timetable datasets, meals, and class-linked resources. Navigation stays open while you complete this.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-[rgba(10,15,27,0.34)] px-4 py-3 text-sm text-[var(--text-muted)]">
            Current state: {getProfileCompletionLabel(user)}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm">
            <span className="text-[var(--text-muted)]">Grade</span>
            <input
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder={PROFILE_GRADE_PLACEHOLDER}
              className="w-full rounded-[18px] border border-white/10 bg-[rgba(10,15,27,0.42)] px-4 py-3 text-[var(--text-strong)]"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--text-muted)]">Section / subgroup</span>
            <input
              value={section}
              onChange={(event) => setSection(event.target.value)}
              placeholder={PROFILE_SECTION_PLACEHOLDER}
              className="w-full rounded-[18px] border border-white/10 bg-[rgba(10,15,27,0.42)] px-4 py-3 text-[var(--text-strong)]"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--text-muted)]">House</span>
            <input
              value={house}
              onChange={(event) => setHouse(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-[18px] border border-white/10 bg-[rgba(10,15,27,0.42)] px-4 py-3 text-[var(--text-strong)]"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--text-muted)]">Boarding / day</span>
            <select
              value={residency ?? ''}
              onChange={(event) => setResidency((event.target.value || undefined) as AppUser['residency'])}
              className="w-full rounded-[18px] border border-white/10 bg-[rgba(10,15,27,0.42)] px-4 py-3 text-[var(--text-strong)]"
            >
              <option value="">Optional</option>
              <option value="boarding">Boarding</option>
              <option value="day">Day</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105 disabled:opacity-60"
          >
            {saving ? 'Saving profile…' : 'Save profile'}
          </button>
          <p className="text-sm text-[var(--text-muted)]">
            This is the minimum profile data needed for timetable matching. Clubs, dashboard navigation, and certificates remain usable without it.
          </p>
        </div>
      </div>
    </div>
  );
}

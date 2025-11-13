import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { AppUser } from '../../types/User';
import { issueCertificate, uploadCertificateAsset } from '../../services/certificatesService';
import { useAuth } from '../../hooks/useAuth';

type Props = {
  users: AppUser[];
  onIssued?: () => void;
};

export function CertificateUploader({ users, onIssued }: Props) {
  const { user } = useAuth();
  const [targetUserId, setTargetUserId] = useState('');
  const [clubName, setClubName] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!targetUserId || !clubName || !eventTitle) {
      setStatus('Fill in all fields.');
      return;
    }
    const target = users.find((candidate) => candidate.id === targetUserId);
    if (!target) {
      setStatus('Select a valid user.');
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      let fileUrl: string | undefined;
      let storagePath: string | undefined;
      if (file) {
        const uploaded = await uploadCertificateAsset(target.id, file);
        fileUrl = uploaded.url;
        storagePath = uploaded.path;
      }
      const verifierId = uuid();
      await issueCertificate({
        userId: target.id,
        userName: target.name,
        clubName,
        eventTitle,
        verifierId,
        fileUrl,
        storagePath,
        uploadedBy: user?.id
      });
      setStatus(`Issued certificate. Verifier: ${verifierId}`);
      setClubName('');
      setEventTitle('');
      setFile(null);
      onIssued?.();
    } catch (err: any) {
      setStatus(err?.message ?? 'Failed to upload certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-glass">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Upload certificate</p>
        <p className="text-sm text-white/60">Attach a PDF or image and issue it to a student.</p>
      </div>
      <label className="space-y-1 text-sm text-white/80">
        Recipient
        <select
          value={targetUserId}
          onChange={(event) => setTargetUserId(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/90 px-3 py-2 text-slate-900"
        >
          <option value="">Select user</option>
          {users.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} ({candidate.email})
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm text-white/80">
        Club / Issuer
        <input value={clubName} onChange={(event) => setClubName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <label className="space-y-1 text-sm text-white/80">
        Event / Context
        <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
      </label>
      <label className="space-y-1 text-sm text-white/80">
        Certificate file (optional)
        <input type="file" accept="application/pdf,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2" />
      </label>
      <button type="button" disabled={isSubmitting} onClick={submit} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-60">
        {isSubmitting ? 'Issuing…' : 'Issue certificate'}
      </button>
      {status && <p className="text-xs text-white/60">{status}</p>}
    </div>
  );
}

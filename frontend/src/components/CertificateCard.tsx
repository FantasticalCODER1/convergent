import type { CertificateRecord } from '../types/Certificate';
import { formatTimestamp } from '../lib/formatters';

type Props = {
  certificate: CertificateRecord;
};

export function CertificateCard({ certificate }: Props) {
  const issuedAt = formatTimestamp(certificate.issuedAt, 'Pending issuance');
  const verifyUrl = `${window.location.origin}/verify?id=${certificate.verifierId}`;
  const primaryUrl = certificate.fileUrl ?? verifyUrl;
  const primaryLabel = certificate.fileUrl ? 'Open certificate file' : 'Open verification page';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-white shadow-glass">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">{certificate.clubName}</p>
          <h3 className="mt-1 text-2xl font-semibold">{certificate.eventTitle}</h3>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-emerald-200">Verified record</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Issued</p>
          <p className="mt-2 text-sm text-white">{issuedAt}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Recipient</p>
          <p className="mt-2 text-sm text-white">{certificate.userName}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-emerald-300">Verifier code · {certificate.verifierId}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={primaryUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
        >
          {primaryLabel}
        </a>
        <a
          href={verifyUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          View verification page
        </a>
      </div>
    </div>
  );
}

import type { CertificateRecord } from '../types/Certificate';
import { formatTimestamp } from '../lib/formatters';
import { QuietBadge, StatRow } from './ui/product';

type Props = {
  certificate: CertificateRecord;
};

export function CertificateCard({ certificate }: Props) {
  const issuedAt = formatTimestamp(certificate.issuedAt, 'Pending issuance');
  const verifyUrl = `${window.location.origin}/verify?id=${certificate.verifierId}`;
  const primaryUrl = certificate.fileUrl ?? verifyUrl;
  const primaryLabel = certificate.fileUrl ? 'Open certificate file' : 'Open verification page';

  return (
    <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(31,40,64,0.9),rgba(20,27,46,0.9))] p-5 text-[var(--text-strong)] shadow-[0_24px_60px_rgba(3,8,22,0.24)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">{certificate.clubName}</p>
          <h3 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.04em]">{certificate.eventTitle}</h3>
        </div>
        <QuietBadge tone="accent">Verified record</QuietBadge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <StatRow label="Issued" value={issuedAt} />
        <StatRow label="Recipient" value={certificate.userName} />
      </div>

      <div className="mt-4 rounded-[20px] border border-cyan-400/18 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100">
        Verifier code · <span className="font-medium">{certificate.verifierId}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={primaryUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-slate-950 transition hover:brightness-110"
        >
          {primaryLabel}
        </a>
        <a
          href={verifyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--text-strong)] transition hover:bg-white/8"
        >
          View verification page
        </a>
      </div>
    </div>
  );
}

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
    <div className="rounded-[12px] border border-[color:var(--line)] bg-[color:var(--panel)] p-5 text-[var(--text-strong)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--text-faint)]">{certificate.clubName}</p>
          <h3 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.04em]">{certificate.eventTitle}</h3>
        </div>
        <QuietBadge tone="accent">Verified record</QuietBadge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <StatRow label="Issued" value={issuedAt} />
        <StatRow label="Recipient" value={certificate.userName} />
      </div>

      <div className="mt-4 rounded-[10px] border border-[color:var(--academic-blue-line)] bg-[var(--academic-blue-soft)] px-4 py-3 text-sm text-[var(--academic-blue)]">
        Verifier code · <span className="font-medium">{certificate.verifierId}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={primaryUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-[10px] bg-[var(--academic-blue)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          {primaryLabel}
        </a>
        <a
          href={verifyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] px-4 py-2 text-sm text-[var(--text-strong)] transition hover:bg-[color:var(--panel-2)]"
        >
          View verification page
        </a>
      </div>
    </div>
  );
}

import type { CertificateRecord } from '../types/Certificate';

type Props = {
  certificate: CertificateRecord;
};

export function CertificateCard({ certificate }: Props) {
  const issuedAt = certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : 'Pending';
  const verifyUrl = `${window.location.origin}/verify?id=${certificate.verifierId}`;

  return (
    <a
      href={certificate.fileUrl ?? verifyUrl}
      target="_blank"
      rel="noreferrer"
      className="rounded-3xl border border-white/10 bg-white/10 p-5 text-white shadow-glass transition hover:bg-white/20"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{certificate.clubName}</p>
      <h3 className="mt-1 text-2xl font-semibold">{certificate.eventTitle}</h3>
      <p className="text-sm text-white/70">Issued {issuedAt}</p>
      <p className="mt-3 text-xs text-emerald-300">Verifier · {certificate.verifierId.slice(0, 8)}…</p>
      <p className="mt-1 text-xs text-white/50">Tap to view {certificate.fileUrl ? 'certificate file' : 'verification page'}.</p>
    </a>
  );
}

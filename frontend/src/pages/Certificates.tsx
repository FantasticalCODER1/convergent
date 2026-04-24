import { useAuth } from '../hooks/useAuth';
import { useCertificates } from '../hooks/useCertificates';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { MetricCard, PageHeader, SurfaceSection } from '../components/ui/product';
import { formatTimestamp } from '../lib/formatters';

export default function Certificates() {
  const { user } = useAuth();
  const { certificates, loading } = useCertificates();

  if (!user) {
    return (
      <EmptyStateCard
        eyebrow="Credentials"
        title="Sign in to view certificate records"
        body="Certificate history and verification links stay attached to your signed-in school profile."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Credentials"
        title="Certificates"
        description="Issued certificates and public verification links."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Records" value={String(certificates.length)} hint="Issued to your profile" />
            <MetricCard label="Verification" value="Live" hint="Each record keeps a public verify link" tone="accent" />
          </div>
        }
      />

      <SurfaceSection
        eyebrow="Issued records"
        title="Certificate ledger"
      >
        {loading ? (
          <div className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel-2)] p-8 text-center text-sm text-[var(--text-muted)]">
            Loading certificates...
          </div>
        ) : certificates.length === 0 ? (
          <div className="ledger-table">
            <div className="ledger-header grid-cols-[minmax(0,1.1fr)_180px_140px_120px]">
              <span>Certificate</span>
              <span>Club/Event</span>
              <span>Issued</span>
              <span>Status</span>
            </div>
            <div className="ledger-row grid-cols-[minmax(0,1.1fr)_180px_140px_120px] text-sm text-[var(--text-muted)]">
              <span>No certificates issued yet.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          </div>
        ) : (
          <div className="ledger-table">
            <div className="ledger-header grid-cols-[minmax(0,1.1fr)_180px_140px_120px_150px]">
              <span>Certificate</span>
              <span>Club/Event</span>
              <span>Issued</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {certificates.map((cert) => (
              <div key={cert.id} className="ledger-row grid-cols-[minmax(0,1.1fr)_180px_140px_120px_150px] text-sm">
                <span className="font-semibold text-[var(--text-strong)]">{cert.eventTitle}</span>
                <span className="text-[var(--text-muted)]">{cert.clubName}</span>
                <span className="text-[var(--text-muted)]">{formatTimestamp(cert.issuedAt, 'Pending')}</span>
                <span className="font-semibold text-[var(--academic-blue)]">Verified</span>
                <a
                  href={`/verify?id=${cert.verifierId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--academic-blue)] transition hover:text-[var(--text-strong)]"
                >
                  Open verification
                </a>
              </div>
            ))}
          </div>
        )}
      </SurfaceSection>
    </div>
  );
}

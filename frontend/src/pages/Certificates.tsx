import { useAuth } from '../hooks/useAuth';
import { useCertificates } from '../hooks/useCertificates';
import { CertificateCard } from '../components/CertificateCard';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { MetricCard, PageHeader, SurfaceSection } from '../components/ui/product';

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
        description="This surface now reads like a student record ledger: issued credentials, public verification, and linked proof without the old generic dashboard-card treatment."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Records" value={String(certificates.length)} hint="Issued to your profile" />
            <MetricCard label="Verification" value="Live" hint="Each record keeps a public verify link" tone="accent" />
          </div>
        }
      />

      <SurfaceSection
        eyebrow="Issued records"
        title="Verified certificate history"
        description="Issuance stays inside club workspaces, while this page keeps the student view compact, readable, and verification-first."
      >
        {loading ? (
          <div className="rounded-[22px] border border-white/8 bg-[rgba(10,15,27,0.32)] p-8 text-center text-sm text-[var(--text-muted)]">
            Loading certificates…
          </div>
        ) : certificates.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-[rgba(10,15,27,0.22)] p-8 text-center text-sm leading-7 text-[var(--text-muted)]">
            No certificates have been issued to this profile yet. When a club publishes one, it will appear here with a public verification page and any attached certificate asset.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} certificate={cert} />
            ))}
          </div>
        )}
      </SurfaceSection>
    </div>
  );
}

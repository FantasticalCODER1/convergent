import { useAuth } from '../hooks/useAuth';
import { useCertificates } from '../hooks/useCertificates';
import { CertificateCard } from '../components/CertificateCard';

export default function Certificates() {
  const { user } = useAuth();
  const { certificates, loading } = useCertificates();

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">
        Sign in to generate and view certificates.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">Credentials</p>
          <h1 className="text-3xl font-semibold text-white">Certificates</h1>
          <p className="text-white/60">View your certificate history. Issuance now happens from club management surfaces.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        {loading ? (
          <div className="p-8 text-center text-white/70">Loading certificates…</div>
        ) : certificates.length === 0 ? (
          <div className="p-8 text-center text-white/70">No certificates yet. Issue one to test the flow.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} certificate={cert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

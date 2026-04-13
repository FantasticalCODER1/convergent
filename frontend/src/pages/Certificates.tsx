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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">Credentials</p>
          <h1 className="text-3xl font-semibold text-white">Certificates</h1>
          <p className="text-white/60">View your certificate history. Issuance now happens from club management surfaces.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Records" value={String(certificates.length)} hint="Issued to your profile" />
          <Metric label="Verification" value="Live" hint="Each record keeps a public verify link" />
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        {loading ? (
          <div className="p-8 text-center text-white/70">Loading certificates…</div>
        ) : certificates.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-8 text-center text-white/70">
            No certificates yet. When a club issues one, it will appear here with its verification link and downloadable asset.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} certificate={cert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-glass">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/50">{hint}</p>
    </div>
  );
}

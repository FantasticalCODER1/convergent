import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { v4 as uuid } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { data } from '../data';
import type { CertDoc } from '../data/DataProvider';

type Certificate = CertDoc & { verifierUrl: string };

export default function Certificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  const loadCertificates = async (uid: string) => {
    const entries = await data.listCertsForUser(uid);
    setCertificates(
      entries.map((entry) => ({
        ...entry,
        verifierUrl: `${window.location.origin}/verify?id=${entry.verifierId}`
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadCertificates(user.id);
  }, [user]);

  const issueSample = async () => {
    if (!user) return;
    setIssuing(true);
    try {
      const verifierId = uuid();
      await data.createCert({
        userUid: user.id,
        name: user.name,
        eventTitle: 'Sample Event',
        clubName: 'Convergent',
        issuedAt: Date.now(),
        verifierId
      });

      const verifierUrl = `${window.location.origin}/verify?id=${verifierId}`;

      const qrUrl = await QRCode.toDataURL(verifierUrl);
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.text('Certificate of Participation', 60, 100);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Awarded to ${user.name}`, 60, 150);
      pdf.text('For outstanding contribution to Sample Event', 60, 180);
      pdf.text('Scan to verify', 60, 220);
      pdf.addImage(qrUrl, 'PNG', 60, 240, 160, 160);
      pdf.save('certificate.pdf');

      await loadCertificates(user.id);
    } catch (error) {
      console.error('Failed to issue certificate', error);
    } finally {
      setIssuing(false);
    }
  };

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
          <p className="text-white/60">Issue verifiable certificates with QR validation.</p>
        </div>
        <button
          type="button"
          onClick={issueSample}
          disabled={issuing || !user}
          className="rounded-2xl bg-emerald-500 px-5 py-3 font-medium text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {issuing ? 'Generating…' : 'Generate sample certificate'}
        </button>
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-glass">
        {loading ? (
          <div className="p-8 text-center text-white/70">Loading certificates…</div>
        ) : certificates.length === 0 ? (
          <div className="p-8 text-center text-white/70">No certificates yet. Issue one to test the flow.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map((cert) => (
              <a
                key={cert.id}
                href={cert.verifierUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-3xl border border-white/5 bg-white/10 p-4 transition hover:bg-white/20"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">{cert.clubName}</p>
                <h3 className="text-2xl font-semibold text-white">{cert.eventTitle}</h3>
                <p className="text-sm text-white/60">
                  Issued {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '—'}
                </p>
                <p className="mt-4 text-xs text-emerald-300">Tap to verify</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

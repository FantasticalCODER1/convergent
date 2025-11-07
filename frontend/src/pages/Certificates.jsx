/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Certificates management page allowing managers to preview and generate digital certificates.
// TODO: Integrate bulk issuance flows, analytics, and mobile-friendly certificate wallets.

import { useState } from 'react';
import confetti from 'canvas-confetti';
import CertificateTemplate from '../components/CertificateTemplate.jsx';
import { generateQrDataUrl } from '../utils/qrGenerator.jsx';
import { generateCertificatePdf } from '../utils/pdfGenerator.jsx';

export default function Certificates() {
  const [qrPreview, setQrPreview] = useState(null);
  const [isCelebrating, setIsCelebrating] = useState(false);

  const handleGenerate = async () => {
    setIsCelebrating(true);
    const qrUrl = await generateQrDataUrl('https://example.com/certificate/verify');
    setQrPreview(qrUrl);

    const pdf = generateCertificatePdf({
      studentName: 'Student Name',
      clubName: 'Club Name',
      eventName: 'Event Name',
      date: new Date().toLocaleDateString(),
      qrDataUrl: qrUrl
    });

    pdf.save('certificate-demo.pdf');

    confetti({
      particleCount: 180,
      spread: 60,
      origin: { y: 0.7 }
    });
    setTimeout(() => setIsCelebrating(false), 1200);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-accent text-2xl font-semibold">Certificates</h2>
          <p className="text-sm text-slate-500">
            Issue, manage, and verify participation certificates for your clubs.
          </p>
        </div>
        <button
          className="bg-brand shadow-soft duration-250 hover:bg-brand-dark rounded-full px-4 py-2 text-sm font-semibold text-white transition"
          onClick={handleGenerate}
          type="button"
        >
          {isCelebrating ? 'Generating…' : 'Generate sample certificate'}
        </button>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <CertificateTemplate
          studentName="Student Name"
          clubName="Robotics Club"
          eventName="Annual Showcase"
          date="1 Jan 2024"
        />
        <div className="shadow-soft rounded-3xl border border-slate-200 bg-white/95 p-6">
          <h3 className="text-lg font-semibold text-slate-800">QR Preview</h3>
          <p className="mt-2 text-sm text-slate-500">Each certificate includes a QR code for verification.</p>
          {qrPreview ? (
            <img src={qrPreview} alt="QR preview" className="border-brand/30 shadow-soft mx-auto mt-4 size-32 rounded-xl border p-2" />
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-400">
              Generate a sample certificate to preview the QR code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

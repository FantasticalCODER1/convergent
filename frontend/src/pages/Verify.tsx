import { useEffect, useState } from 'react';
import { verifyCertificateByCode } from '../services/certificatesService';
import { formatTimestamp } from '../lib/formatters';
import type { CertificateRecord } from '../types/Certificate';
import { QuietBadge, StatRow } from '../components/ui/product';

type VerifyState =
  | { status: 'loading' }
  | { status: 'invalid'; message: string }
  | { status: 'valid'; cert: CertificateRecord };

export default function Verify() {
  const [state, setState] = useState<VerifyState>({ status: 'loading' });

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');
    if (!id) {
      setState({ status: 'invalid', message: 'Missing certificate id.' });
      return;
    }
    verifyCertificateByCode(id)
      .then((cert) => {
        if (!cert) {
          setState({ status: 'invalid', message: 'Certificate not found.' });
        } else {
          setState({ status: 'valid', cert });
        }
      })
      .catch(() => setState({ status: 'invalid', message: 'Unable to verify certificate.' }));
  }, []);

  if (state.status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(30,42,76,0.5),transparent_42%),var(--app-bg)] text-[var(--text-muted)]">Checking certificate…</div>;
  }

  if (state.status === 'invalid') {
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(30,42,76,0.5),transparent_42%),var(--app-bg)] px-4 text-center text-[var(--text-strong)]">
        <div className="w-full max-w-2xl rounded-[34px] border border-rose-300/18 bg-[linear-gradient(180deg,rgba(65,31,41,0.72),rgba(33,19,27,0.72))] px-10 py-9 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
          <QuietBadge tone="warning">Verification failed</QuietBadge>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-rose-50">Certificate not found</h1>
          <p className="mt-3 text-base leading-7 text-rose-100/80">{state.message}</p>
        </div>
      </div>
    );
  }

  const cert = state.cert;
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(30,42,76,0.5),transparent_42%),var(--app-bg)] px-4 text-[var(--text-strong)]">
      <div className="w-full max-w-3xl rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,28,46,0.96),rgba(14,20,35,0.96))] px-10 py-9 shadow-[0_36px_90px_rgba(0,0,0,0.32)]">
        <QuietBadge tone="accent">Verified</QuietBadge>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-[var(--text-strong)]">Certificate is valid</h1>
        <p className="mt-4 text-xl leading-9 text-[var(--text-muted)]">
          Awarded to <span className="font-semibold text-[var(--text-strong)]">{cert.userName}</span> for{' '}
          <span className="font-semibold text-[var(--text-strong)]">{cert.eventTitle}</span>
          {cert.clubName ? ` · ${cert.clubName}` : ''}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <StatRow label="Issued" value={formatTimestamp(cert.issuedAt)} />
          <StatRow label="Verification code" value={cert.verifierId} />
        </div>
        {cert.fileUrl ? (
          <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600">
            Open certificate asset
          </a>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { verifyCertificateByCode } from '../services/certificatesService';
import { formatTimestamp } from '../lib/formatters';
import type { CertificateRecord } from '../types/Certificate';

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
    return <div className="grid min-h-screen place-items-center text-white/70">Checking certificate…</div>;
  }

  if (state.status === 'invalid') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-center text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-10 py-8">
          <h1 className="text-3xl font-semibold text-rose-200">Certificate not found</h1>
          <p className="mt-3 text-white/70">{state.message}</p>
        </div>
      </div>
    );
  }

  const cert = state.cert;
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="w-full max-w-2xl rounded-[40px] border border-white/10 bg-white/5 px-10 py-8 shadow-glass">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Verified</p>
        <h1 className="text-4xl font-semibold text-white">Certificate is valid</h1>
        <p className="mt-4 text-lg text-white/80">
          Awarded to <span className="font-semibold text-white">{cert.userName}</span> for{' '}
          <span className="font-semibold text-white">{cert.eventTitle}</span>
          {cert.clubName ? ` · ${cert.clubName}` : ''}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Issued</p>
            <p className="mt-2 text-sm text-white">{formatTimestamp(cert.issuedAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Verification code</p>
            <p className="mt-2 text-sm text-white">{cert.verifierId}</p>
          </div>
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

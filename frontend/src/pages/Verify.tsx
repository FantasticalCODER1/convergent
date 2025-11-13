import { useEffect, useState } from 'react';
import { data as provider } from '../data';
import type { CertDoc } from '../data/DataProvider';

type VerifyState =
  | { status: 'loading' }
  | { status: 'invalid'; message: string }
  | { status: 'valid'; cert: CertDoc };

export default function Verify() {
  const [state, setState] = useState<VerifyState>({ status: 'loading' });

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');
    if (!id) {
      setState({ status: 'invalid', message: 'Missing certificate id.' });
      return;
    }
    provider
      .getCertByVerifier(id)
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
      <div className="rounded-[40px] border border-white/10 bg-white/5 px-10 py-8 shadow-glass">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Verified</p>
        <h1 className="text-4xl font-semibold text-white">Certificate is valid</h1>
        <p className="mt-4 text-lg text-white/80">
          Awarded to <span className="font-semibold text-white">{cert.name}</span> for{' '}
          <span className="font-semibold text-white">{cert.eventTitle}</span>
          {cert.clubName ? ` · ${cert.clubName}` : ''}
        </p>
        {cert.issuedAt && (
          <p className="mt-2 text-sm text-white/60">Issued at {new Date(cert.issuedAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

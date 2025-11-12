import { useEffect, useState } from 'react';

type VerifyResponse = {
  ok: boolean;
  valid: boolean;
  data?: {
    name: string;
    eventTitle: string;
    clubName?: string;
    issuedAt?: string;
  };
  error?: string;
};

export default function Verify() {
  const [state, setState] = useState<VerifyResponse | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');
    if (!id) {
      setState({ ok: false, valid: false, error: 'Missing certificate id' });
      return;
    }
    fetch(`/verifyCertificate?id=${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((data) => setState(data))
      .catch(() => setState({ ok: false, valid: false, error: 'Unable to verify certificate.' }));
  }, []);

  if (!state) {
    return <div className="grid min-h-screen place-items-center text-white/70">Checking certificate…</div>;
  }

  if (!state.ok || !state.valid) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-center text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-10 py-8">
          <h1 className="text-3xl font-semibold text-rose-200">Certificate not found</h1>
          <p className="mt-3 text-white/70">{state.error ?? 'The verification link is invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  const data = state.data!;
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="rounded-[40px] border border-white/10 bg-white/5 px-10 py-8 shadow-glass">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Verified</p>
        <h1 className="text-4xl font-semibold text-white">Certificate is valid</h1>
        <p className="mt-4 text-lg text-white/80">
          Awarded to <span className="font-semibold text-white">{data.name}</span> for{' '}
          <span className="font-semibold text-white">{data.eventTitle}</span>
          {data.clubName ? ` · ${data.clubName}` : ''}
        </p>
        {data.issuedAt && <p className="mt-2 text-sm text-white/60">Issued at {data.issuedAt}</p>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { getGoogleAccessAndProfile, clearGoogleAuthCache, getGoogleConfigSummary } from '../auth/google';

const TOKEN_LIFETIME_MS = 55 * 60 * 1000;

export default function DebugOAuth() {
  const [out, setOut] = useState<any>(null);
  const cfg = getGoogleConfigSummary();

  const run = async () => {
    try {
      const issuedAt = Date.now();
      const { accessToken, profile } = await getGoogleAccessAndProfile();
      const approxExpiresInMin = Math.max(1, Math.round((TOKEN_LIFETIME_MS - (Date.now() - issuedAt)) / 60000));
      setOut({
        ok: true,
        tokenPreview: `${accessToken.slice(0, 12)}…`,
        expiresInMin: approxExpiresInMin,
        profile
      });
    } catch (e: any) {
      setOut({ ok: false, error: e?.message ?? String(e) });
    }
  };

  const clearCache = () => {
    clearGoogleAuthCache();
    setOut(null);
  };

  return (
    <div className="p-6 space-y-3 text-white">
      <h1 className="text-xl font-semibold">OAuth Debug</h1>
      <pre className="bg-white/10 p-3 rounded">{JSON.stringify(cfg, null, 2)}</pre>
      <div className="flex gap-2">
        <button onClick={run} className="px-3 py-2 rounded bg-indigo-500">
          Get token &amp; profile
        </button>
        <button onClick={clearCache} className="px-3 py-2 rounded bg-white/10">
          Clear cache
        </button>
      </div>
      {out && <pre className="bg-white/10 p-3 rounded">{JSON.stringify(out, null, 2)}</pre>}
      <p className="opacity-70 text-sm">If you see ok:false with invalid_client or origin_mismatch, fix GCP config below.</p>
    </div>
  );
}

declare const google: any;

export type GoogleProfile = {
  sub: string;
  name: string;
  email: string;
  picture?: string;
};

type Cached = {
  accessToken?: string;
  idToken?: string;
  expiresAt?: number;
  profile?: GoogleProfile;
};

const REQUIRED_SUFFIX = '.apps.googleusercontent.com';
const TOKEN_EXPIRY_FALLBACK_MS = 55 * 60 * 1000;
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

let cached: Cached = {};
let hasPromptedConsent = false;

function assertClientId(): string {
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
  }
  if (!clientId.endsWith(REQUIRED_SUFFIX)) {
    throw new Error('VITE_GOOGLE_CLIENT_ID must end with .apps.googleusercontent.com');
  }
  return clientId;
}

function waitForGIS(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const poll = () => {
      if ((window as any).google?.accounts?.oauth2) resolve();
      else setTimeout(poll, 50);
    };
    poll();
  });
}

function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error('Google auth error');
  }
}

async function requestAccessToken(prompt: '' | 'consent') {
  await waitForGIS();
  const cid = assertClientId();

  const response = await new Promise<{ accessToken: string; idToken?: string; expiresInMs: number }>((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cid,
      scope: SCOPES,
      prompt,
      callback: (resp: any) => {
        if (resp?.error) {
          reject(normalizeError(resp));
          return;
        }
        if (!resp?.access_token) {
          reject(new Error('No access token returned'));
          return;
        }
        const expiresIn = Number(resp.expires_in ?? 0);
        resolve({
          accessToken: resp.access_token,
          idToken: resp.id_token,
          expiresInMs: (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : TOKEN_EXPIRY_FALLBACK_MS)
        });
      },
      error_callback: (err: any) => reject(normalizeError(err))
    });
    tokenClient.requestAccessToken();
  });

  cached = {
    accessToken: response.accessToken,
    idToken: response.idToken,
    expiresAt: Date.now() + response.expiresInMs,
    profile: undefined // force refetch to ensure freshness
  };

  console.log('[auth/google] Issued access token via prompt', prompt || 'silent');
  return cached;
}

async function ensureValidAccessToken() {
  if (cached.accessToken && cached.expiresAt && Date.now() < cached.expiresAt - 60_000) {
    return cached;
  }

  const firstPrompt = hasPromptedConsent ? '' : 'consent';
  try {
    const fresh = await requestAccessToken(firstPrompt);
    hasPromptedConsent = true;
    return fresh;
  } catch (err) {
    if (firstPrompt === '') {
      console.warn('[auth/google] Silent refresh failed, prompting user');
      const fresh = await requestAccessToken('consent');
      hasPromptedConsent = true;
      return fresh;
    }
    throw normalizeError(err);
  }
}

function shapeProfile(payload: any): GoogleProfile {
  if (!payload?.sub) throw new Error('PROFILE_FETCH_FAILED');
  return {
    sub: String(payload.sub),
    name: payload.name ?? payload.fullName ?? '',
    email: payload.email ?? '',
    picture: payload.picture ?? payload.photo ?? payload.avatar
  };
}

async function fetchUserInfo(accessToken: string): Promise<GoogleProfile> {
  const endpoints = [
    'https://openidconnect.googleapis.com/v1/userinfo',
    'https://www.googleapis.com/oauth2/v3/userinfo'
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      console.log('[auth/google] Using userinfo endpoint', url, 'status', response.status);
      if (response.ok) {
        const data = await response.json();
        return shapeProfile(data);
      }
    } catch (err) {
      console.warn('[auth/google] userinfo fetch failed for', url, err);
    }
  }

  if (cached.idToken) {
    try {
      const [, payloadBase64] = cached.idToken.split('.');
      const payload = JSON.parse(atob(payloadBase64));
      console.log('[auth/google] Decoded profile from id_token');
      return shapeProfile(payload);
    } catch (err) {
      console.warn('[auth/google] Failed to decode id_token', err);
    }
  }

  throw new Error('PROFILE_FETCH_FAILED');
}

export async function getGoogleAccessAndProfile(): Promise<{ accessToken: string; profile: GoogleProfile; idToken?: string }> {
  const state = await ensureValidAccessToken();
  if (!state.accessToken) throw new Error('ACCESS_TOKEN_MISSING');

  if (!state.profile) {
    const profile = await fetchUserInfo(state.accessToken);
    state.profile = profile;
    cached.profile = profile;
  }

  return { accessToken: state.accessToken, profile: state.profile, idToken: state.idToken };
}

export function getGoogleConfigSummary() {
  return {
    clientIdSuffixOk: !!clientId && clientId.endsWith(REQUIRED_SUFFIX),
    clientIdPresent: !!clientId,
    origin: window.location.origin,
    scopes: SCOPES
  };
}

export function clearGoogleAuthCache() {
  cached = {};
  hasPromptedConsent = false;
  console.log('[auth/google] Cleared cached auth state');
}

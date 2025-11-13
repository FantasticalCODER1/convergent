# Convergent OAuth (super-short)

1. Go to **OAuth consent screen** → set to **Testing**, add your email in **Test users**, Save.
2. Go to **Credentials** → **Create Credentials** → **OAuth client ID** → **Web application**.
3. Add these **Authorised JavaScript origins**:
   - http://localhost:5173
   - http://127.0.0.1:5173
   - http://localhost:4173
4. Leave **Redirect URIs** empty.
5. Copy the **Client ID** (must end with `.apps.googleusercontent.com`) → put into `frontend/.env.local`:

VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_DATA_MODE=local

6. Restart: `cd frontend && npm run dev`
7. Visit `/debug/oauth` → click **Get token**. Expect `ok: true`.
8. If it still fails: remove app from Google Account → Security → Third-party access → try again.

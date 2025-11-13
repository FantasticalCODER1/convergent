# Google OAuth checklist for localhost

1. Create **OAuth client ID (Web application)** in Google Cloud Console for the SAME project.
2. In the OAuth client, add **Authorised JavaScript origins**:
   - http://localhost:5173
   - http://127.0.0.1:5173
   - http://localhost:4173 (Vite preview, if used)
3. Copy the client ID that ends with `.apps.googleusercontent.com` into `.env.local`:
   - `VITE_GOOGLE_CLIENT_ID=XXXXXXXXXXXX-YYYYYYYYYYYYYYYYYYYY.apps.googleusercontent.com`
4. OAuth consent screen:
   - Publishing status: Testing or In production
   - If Testing, add your Google account under **Test users**.
   - Scopes included: openid, email, profile, Classroom read, Calendar events.
5. In your deployed demo later, add the production domain to **Authorised JavaScript origins**.
6. Clear old tokens if you changed the client:
   - In Google account > Security > Third-party access > remove the app.
   - Hard refresh the site.

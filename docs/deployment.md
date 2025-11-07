# Deployment Guide

## Prerequisites
- Firebase project with Firestore, Functions, and Hosting enabled.
- Vercel account (optional) for frontend hosting if not using Firebase Hosting.
- Node.js 18+ and npm 9+ locally.

## 1. Configure Firebase
1. Login: `firebase login`
2. Initialize from repo root (already configured): `firebase use <project-id>`
3. Update `frontend/.env` with Firebase web credentials.

## 2. Local Verification
```bash
# Frontend
cd frontend
npm install
npm run lint
npm run build

# Backend
cd ../backend
npm install
npm run lint
npm run serve:functions
```

## 3. GitHub Actions Deployment
The workflow `.github/workflows/deploy.yml` handles deployment on pushes to `main`:
- Installs dependencies
- Runs lint + tests (future)
- Builds the frontend and deploys to Firebase Hosting
- Deploys Functions via `firebase deploy --only functions`

Ensure the following secrets are added to the repository:
- `FIREBASE_SERVICE_ACCOUNT` – base64 encoded service account JSON
- `FIREBASE_PROJECT_ID` – Firebase project identifier
- `VITE_FIREBASE_*` – mirrored values for frontend build (if hosting via CI)

## 4. Manual Deployment (Fallback)
```bash
cd frontend
npm run build
firebase deploy --only hosting

cd ../backend
npm run deploy
```

## 5. Post-Deployment Checklist
- Verify Google SSO domain restrictions in Firebase Console.
- Confirm Firestore security rules incorporate roles from `roles.json`.
- Test certificate generation, QR verification, and sample attendance check-in.

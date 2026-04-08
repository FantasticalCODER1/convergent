# Deployment and Emulator Guide

## Prerequisites
- Node.js 18+
- npm 9+
- Java 21+ for Firestore/Storage emulators
- Firebase CLI installed locally or via the root repo dependency set
- Firebase project with Auth, Firestore, Storage, and Functions enabled

## Frontend Environment
Populate `frontend/.env.local` from `frontend/.env.example`.

Important values:
- Firebase web config
- `VITE_GOOGLE_CLIENT_ID`
- optional emulator flags:
  - `VITE_USE_FIREBASE_EMULATORS=true`
  - `VITE_ENABLE_EMULATOR_LOGIN=true`
  - `VITE_FUNCTIONS_EMULATOR_HOST`
  - `VITE_FUNCTIONS_EMULATOR_PORT`
  - `VITE_FIRESTORE_EMULATOR_HOST`
  - `VITE_FIRESTORE_EMULATOR_PORT`
  - `VITE_STORAGE_EMULATOR_HOST`
  - `VITE_STORAGE_EMULATOR_PORT`
  - `VITE_AUTH_EMULATOR_URL`

## Local Validation
```bash
npm run lint
npm run test
npm run check
npm run test:emulators
```

## Emulator Workflow
```bash
npm run test:emulators
```

The canonical emulator workflow now lives at the repo root through `npm run test:emulators`. That command starts Auth, Firestore, Storage, and Functions together using [`backend/firebase.json`](/Users/sumergill/Desktop/convergent/backend/firebase.json) and runs the end-to-end suite in [`tests/emulator-validation.mjs`](/Users/sumergill/Desktop/convergent/tests/emulator-validation.mjs).

## CI Reality
`.github/workflows/deploy.yml` is a validation workflow, not an automated production deploy. It currently runs:
- dependency installation
- `npm run lint`
- `npm run test`
- `npm run check`

## Deployment Notes
- Cloud Functions, Firestore rules, indexes, and Storage rules live under `backend/`.
- Frontend production output comes from `frontend/`.
- Public certificate verification now depends on the deployed Functions surface being available.
- Club-scoped management writes for membership, RSVP, certificate issuance, and event import now depend on the callable Functions surface as well.

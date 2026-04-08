# Testing Guide

## Automated commands
- `npm test`
  Runs the static/unit checks for frontend policy/service contracts and backend rule/function contracts.
- `npm run check`
  Runs frontend typecheck plus the production build.
- `npm run test:emulators`
  Starts Auth, Firestore, Storage, and Functions emulators and runs the end-to-end validation suite in [`tests/emulator-validation.mjs`](/Users/sumergill/Desktop/convergent/tests/emulator-validation.mjs).

## Emulator prerequisites
- Node.js 18+
- Java 21+ on `PATH` or `JAVA_HOME`
- Root dependencies installed with `npm install`

## What `test:emulators` verifies
- Doon School restriction on protected profile creation paths
- user profile creation and re-sync with server role preservation
- admin-only role updates
- club-scoped manager/master permissions
- admin-only school/global event writes
- club membership join/leave aggregate updates
- RSVP aggregate updates
- club-scoped certificate Storage uploads
- certificate issuance and public verification
- club-scoped roster lookup for management surfaces
- idempotent import apply through the privileged Function

## Seeded emulator users
- `admin@doonschool.com`
- `master@doonschool.com`
- `manager@doonschool.com`
- `student@doonschool.com`
- `sync@doonschool.com`
- `outsider@example.com`

All seeded users use password `password123` for emulator-only login.

## Manual emulator UI checks
1. Set `VITE_USE_FIREBASE_EMULATORS=true` and `VITE_ENABLE_EMULATOR_LOGIN=true` in `frontend/.env.local`.
2. Start the frontend normally.
3. Start the Firebase emulators separately with the same ports from [`backend/firebase.json`](/Users/sumergill/Desktop/convergent/backend/firebase.json), for example `npx firebase emulators:start --project demo-convergent --config backend/firebase.json`.
4. Sign in from `/login` with one of the seeded emulator users.
5. Validate:
   - manager/master/admin can manage only allowed club surfaces
   - `/admin` is admin-only
   - club imports show preview before apply
   - certificate issuance happens from club pages, not the certificates index page

## Explicitly unverified
- Google GIS production login against live Google OAuth
- Google Classroom live API flows
- Google Calendar live API insertion
- production Firebase deployment behavior outside the emulator stack

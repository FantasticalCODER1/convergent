# Convergent Architecture Overview

## System Shape
```text
Google Identity / GIS
        |
        v
Firebase Auth
        |
        v
React + Vite frontend
   |         |         |
   v         v         v
Firestore  Storage  Cloud Functions
```

## Frontend
- React 18 + Vite + Tailwind CSS
- Route-level protected navigation with `RequireAuth` and `RequireRole`
- Firestore client services for users, clubs, posts, events, RSVPs, and certificate lists
- Cloud Functions client calls for public certificate verification and privileged admin/certificate actions
- Google Classroom and Google Calendar integrations remain client-side API calls

## Backend
- Firebase Functions currently expose:
  - `verifyCertificate`
  - `issueCertificate`
  - `updateUserRole`
  - `listClubUsers`
  - `setClubMembership`
  - `setEventRsvp`
  - `applyEventImport`
- Calendar dataset ingestion is server-side through `scripts/importCalendarData.ts`, which reads `data/calendar/datasetsRegistry.json` and writes normalized school calendar events into Firestore using the Admin SDK.
- Firestore is the source of truth for:
  - `users`
  - `clubs`
  - `clubs/{clubId}/memberships`
  - `clubs/{clubId}/posts`
  - `events`
  - `eventRsvps`
  - `certificates`
- Storage now writes new certificate assets under `certificates/{clubId}/{userId}/...`

## Security Model
- Only `@doonschool.com` accounts are accepted by the frontend auth flow and privileged Functions.
- Canonical roles are `student`, `manager`, `master`, and `admin`.
- `manager` and `master` are club-scoped roles derived from `clubs.managerIds`; `admin` is the only global privileged role.
- Firestore rules now match the live collection layout and the callable-function-backed aggregate writes used by the frontend.
- Storage rules restrict certificate uploads to admins or managers/masters of the target club.
- Route guards remain a UI layer only; privileged changes must succeed through rules or Functions.

## Operational Reality
- CI is validation-only. It runs lint, tests, and the existing frontend build/typecheck workflow.
- Emulator validation is repo-owned and runs through `npm run test:emulators`.
- Attendance, logs, reports, and analytics are not implemented in the current backend.
- The Dexie/local-provider code exists for experimentation and export only; it is not the production data path.

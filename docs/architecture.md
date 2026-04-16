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
- Route-level protection with `RequireAuth` and `RequireRole`
- Shared domain layer for categories, profile mapping, memberships, posts, events, schedules, and derived personal calendar composition
- Firestore client services for users, groups, posts, events, timetable datasets, RSVPs, and certificate lists
- Google Classroom remains client-side, but the core model now reserves Classroom and Meet links in posts, events, and groups

## Navigation Structure
- `/calendar` is the main operational page
- `/dashboard` is the summary page
- `/join-clubs` is the discovery and self-serve membership page
- `/my-clubs` is the owned membership/workspace page
- `/my-clubs/:id` is the group detail workspace
- `/classes` is a truthful read-model surface for timetable/meals plus attached Classroom recovery
- `/certificates` remains user-facing
- `/admin` remains restricted to admins

## Backend
- Firebase Functions currently expose:
  - `verifyCertificate`
  - `issueCertificate`
  - `updateUserRole`
  - `listClubUsers`
  - `setClubMembership`
  - `listClubMembershipRequests`
  - `setClubMembershipStatus`
  - `setEventRsvp`
  - `listEventAttendance`
  - `applyEventImport`
- Cloud Functions still own aggregate-sensitive membership and RSVP writes.
- Firestore rules now allow the richer user profile shape plus read access for timetable dataset collections.
- Calendar dataset ingestion remains an operator workflow through `scripts/importCalendarData.ts`; there is no in-app import console.

## Domain Intent
- `posts` are communication records and do not imply time.
- `events` are timed records and carry source metadata plus author snapshots.
- `scheduleEntries` are recurring structure records for academic blocks and meals.
- `scheduleDatasets` advertise dataset readiness even when live entries do not exist yet.
- `users` now store stable academic cohort fields so timetable mapping can happen without depending on volatile auth state.
- the personal calendar is a derived read model composed from school-wide events, approved group events, timetable recurrences, and meals

## Operational Reality
- Membership approval now exists end-to-end for clubs that use `approval_required`, while open clubs still remain self-serve.
- The main calendar intentionally uses a calm overview layer and a separate detailed day view rather than rendering every timetable block directly into month cells.
- Timetable and meal surfaces are intentionally dataset-backed and limited until live cohort mappings exist.
- Legacy `clubs` and `events` field names are preserved where necessary to avoid breaking the current stack during the refactor.

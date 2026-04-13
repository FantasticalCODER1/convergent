# Feature Status

Date updated: April 8, 2026

| Area | Status | Evidence |
| --- | --- | --- |
| Doon School auth restriction | verified | frontend policy tests + emulator profile-write rejection for outsider account |
| Emulator sign-in path | implemented | emulator login now auto-enables in emulator mode and no longer triggers background Google token fetches after local sign-in |
| Emulator/dev Firebase boot | implemented | emulator mode now uses internal demo Firebase defaults and no longer requires a dummy messaging sender id just to start |
| User profile creation/sync | verified | emulator suite covers first-write creation and role-preserving re-sync |
| Admin role updates | verified | callable Function + emulator coverage |
| Club membership join/leave | verified | callable Function + emulator aggregate checks |
| Club detail hub | implemented | role-aware club detail tabs plus club-scoped operations rail for events, attendance, imports, certificates, and roster access |
| Club-scoped management surface | implemented | club detail now carries event editing, attendance review, imports, and certificate issuance instead of collapsing into the admin panel |
| Event create/edit (club-scoped) | verified | emulator suite covers manager success and off-club denial |
| Event create/edit (school-wide) | verified | emulator suite covers admin-only global event writes |
| RSVP path | verified | callable Function + emulator aggregate checks |
| Event import apply path | verified | privileged `applyEventImport` Function with idempotent emulator coverage |
| Event import preview path | verified | client-side normalization/preview only; no direct Firestore apply writes |
| Certificate upload path | verified | Storage emulator coverage on club-scoped path |
| Certificate issuance metadata | verified | callable Function + emulator coverage |
| Club attendance rosters | implemented | new privileged `listEventAttendance` callable backs club-scoped attendee review from the club detail operations rail |
| Club certificate history for managers/admins | implemented | new privileged `listClubCertificates` callable backs club-scoped certificate history inside club detail |
| Clubs directory | implemented | denser club cards now show membership state, managed access, and next scheduled event before opening the club page |
| Calendar event experience | implemented | calendar events now use cleaner rendering, inline modal feedback, .ics fallback outside live Google environments, and edit handoff to club/admin surfaces |
| Certificate history surfaces | implemented | certificate cards now expose consistent verification affordances and the public verify page mirrors the same record hierarchy |
| Public certificate verification | verified | public callable verification covered in emulator suite and surfaced more clearly on the verify page |
| Admin panel | implemented | admin-only route now includes operational school-event tooling, stronger role management presentation, and explicit handoff to club pages for scoped work |
| Club creation | verified | admin-only create flow remains available |
| Google Classroom | unverified | no emulator or live integration coverage in this pass |
| Google Calendar live insert | unverified | live Google API write was not exercised in this pass, but the UI now falls back truthfully to `.ics` download when live Google insert is unavailable |
| Dexie/local provider | partial | still present as non-production support code, not part of validation path |
| Join approval queues | unimplemented | membership remains immediate/self-serve in the current repo; no approval backend exists, so the UI now states that directly |
| Resources tab | unimplemented | omitted from club detail because no wired resource backend exists in the repo |
| Attendance/logs/reports/analytics | partial | RSVP-backed attendance review exists for club events, but broader reporting and analytics are still not implemented in the repo |

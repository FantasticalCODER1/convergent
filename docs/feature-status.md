# Feature Status

Date updated: April 8, 2026

| Area | Status | Evidence |
| --- | --- | --- |
| Doon School auth restriction | verified | frontend policy tests + emulator profile-write rejection for outsider account |
| Emulator sign-in path | verified | emulator login UI plus seeded Auth users |
| User profile creation/sync | verified | emulator suite covers first-write creation and role-preserving re-sync |
| Admin role updates | verified | callable Function + emulator coverage |
| Club membership join/leave | verified | callable Function + emulator aggregate checks |
| Club-scoped management surface | verified | club detail management UI backed by emulator-covered functions/rules |
| Event create/edit (club-scoped) | verified | emulator suite covers manager success and off-club denial |
| Event create/edit (school-wide) | verified | emulator suite covers admin-only global event writes |
| RSVP path | verified | callable Function + emulator aggregate checks |
| Event import apply path | verified | privileged `applyEventImport` Function with idempotent emulator coverage |
| Event import preview path | verified | client-side normalization/preview only; no direct Firestore apply writes |
| Certificate upload path | verified | Storage emulator coverage on club-scoped path |
| Certificate issuance metadata | verified | callable Function + emulator coverage |
| Public certificate verification | verified | public callable verification covered in emulator suite |
| Admin panel | verified | admin-only route and global role management still functional |
| Club creation | verified | admin-only create flow remains available |
| Google Classroom | unverified | no emulator or live integration coverage in this pass |
| Google Calendar live insert | unverified | live Google API flow not exercised in emulators |
| Dexie/local provider | partial | still present as non-production support code, not part of validation path |
| Attendance/logs/reports/analytics | unverified | not implemented in the repo |

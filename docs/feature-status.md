# Feature Status

Date updated: April 16, 2026

| Area | Status | Evidence |
| --- | --- | --- |
| Doon School auth restriction | verified | frontend policy tests + emulator profile-write rejection for outsider account |
| Emulator sign-in path | implemented | emulator login now auto-enables in emulator mode and no longer triggers background Google token fetches after local sign-in |
| Emulator/dev Firebase boot | implemented | emulator mode now uses internal demo Firebase defaults and no longer requires a dummy messaging sender id just to start |
| User profile creation/sync | verified | emulator suite covers first-write creation and role-preserving re-sync |
| Admin role updates | verified | callable Function + emulator coverage |
| Club membership join/leave | verified | callable Function still owns aggregate-sensitive membership writes |
| Club membership approval queues | implemented | approval-required clubs now create pending memberships and expose manager approval actions in the club workspace |
| Club detail hub | implemented | `/clubs/:id` now behaves as browse/detail while `/my-clubs/:id` is the member or manager workspace, reducing mixed discovery/admin semantics |
| Club-scoped management surface | implemented | club workspaces now carry event editing, attendance review, approvals, and certificate issuance without pretending to host a live import console |
| Club post/event linking | implemented | managers can now create post-only, event-only, and post-plus-event updates from the club operations rail, and post writes now satisfy the live rules schema |
| Event create/edit (club-scoped) | verified | emulator suite covers manager success and off-club denial |
| Event create/edit (school-wide) | verified | emulator suite covers admin-only global event writes |
| RSVP path | verified | callable Function + emulator aggregate checks |
| Event import apply path | verified | privileged `applyEventImport` Function with idempotent emulator coverage |
| Event import product surface | partial | backend apply path exists, but the supported operator workflow is still script-driven; the UI now describes it as an ops handoff instead of a live import tool |
| Certificate upload path | verified | Storage emulator coverage on club-scoped path |
| Certificate issuance metadata | verified | callable Function + emulator coverage |
| Club attendance rosters | implemented | new privileged `listEventAttendance` callable backs club-scoped attendee review from the club detail operations rail |
| Club certificate history for managers/admins | implemented | new privileged `listClubCertificates` callable backs club-scoped certificate history inside club detail |
| Clubs directory | implemented | Join Clubs now separates discovery from approved ownership, shows pending requests, and preserves private-link gating before approval |
| My Clubs ownership view | implemented | approved memberships and managed groups now live on a separate page from discovery and pending requests |
| Personal calendar composition | implemented | `/calendar` now derives a user-specific feed from school-wide events, approved group events, timetable recurrences, meals, and academic cohort filters |
| Calendar overview/day view UX | implemented | month overview now condenses academic and meal detail and expands into a time-based day sheet with overlap handling and resource metadata |
| Certificate history surfaces | implemented | certificate cards now expose consistent verification affordances and the public verify page mirrors the same record hierarchy |
| Public certificate verification | verified | public callable verification covered in emulator suite and surfaced more clearly on the verify page |
| Admin panel | implemented | admin-only route now includes operational school-event tooling, stronger role management presentation, and explicit handoff to club pages for scoped work |
| Club creation | verified | admin-only create flow remains available |
| Google Classroom references on clubs/events | partial | Classroom link, course id, post link, code, default Meet link, and resource references can be stored and surfaced with approval-aware gating, while `/classes` now attempts session recovery before falling back to a reconnect state |
| Timetable and meals surface | partial | timetable/meals remain read-only dataset-backed surfaces; when no live cohort mapping exists the UI now reports dataset status directly instead of implying a dependable live school system |
| Google Calendar live insert | unverified | live Google API write was not exercised in this pass, but the UI now falls back truthfully to `.ics` download when live Google insert is unavailable |
| Dexie/local provider | partial | still present as non-production support code, not part of validation path |
| Resources tab | unimplemented | omitted from club detail because no wired resource backend exists in the repo |
| Attendance/logs/reports/analytics | partial | RSVP-backed attendance review exists for club events, but broader reporting and analytics are still not implemented in the repo |
| School inbox review workflow | partial | admin-only review collections and approval/rejection callable exist for proposed calendar changes; external email ingestion is still scaffolded only |

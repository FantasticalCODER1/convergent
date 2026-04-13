# Convergent Foundation

## Purpose
This refactor turns Convergent from a mostly club-centric surface into a school-wide time-and-structure foundation. The goal is not full feature completion; it is the shared model and route architecture required to support:

- school-wide events
- academic timetable / classes
- meals
- clubs and societies
- SUPW
- STA
- Centres of Excellence
- posts / announcements
- Classroom / Meet / resource links
- approval-ready memberships

## Core Model
### User profile
- Stable profile fields now include `grade` and `section` as the minimum academic cohort mapping inputs.
- Optional fields include `house` and `residency`.
- `scheduleAudienceKey` is derived from grade and section and is intended to become the lookup key for timetable datasets.

### Categories
- Category strings are centralized in `frontend/src/domain/categories.ts`.
- The allowed set is: `school_wide`, `academic`, `club`, `society`, `supw`, `sta`, `centre_of_excellence`, `meals`.

### Memberships
- Memberships live under `clubs/{groupId}/memberships/{userId}`.
- The schema supports `pending`, `approved`, and `rejected`.
- Current self-serve joins still write `approved`, but the model is ready for approval queues.

### Posts vs Events
- A `post` is communication.
- An `event` is timed.
- Both support Classroom links, Meet links, generic resource links, visibility, and author snapshots.
- Only events carry `startTime`, `endTime`, `attendanceEnabled`, and source metadata.

### Timetable mapping
- `scheduleEntries` hold recurring academic and meal records.
- `scheduleDatasets` expose readiness metadata and placeholder state even before entries exist.
- `grade + section -> scheduleAudienceKey` is the current mapping foundation.

## Route Strategy
- Calendar is the operational centre.
- Group discovery and owned workspaces are separated:
  - `/join-clubs`
  - `/my-clubs`
  - `/my-clubs/:id`
- Classes is now a combined foundation page for timetable, meals, and Classroom.

## Intentional Placeholders
- timetable datasets
- meal schedules
- group metadata links
- Classroom links
- Meet links
- resource links
- post timelines
- grade/section mapping states

These placeholders are deliberate and should remain explicit until real datasets are attached.

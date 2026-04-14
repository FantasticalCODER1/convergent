# Personal Calendar Composition

Date updated: April 14, 2026

## What `/calendar` Now Represents

`/calendar` is the main operational page of Convergent.

It is no longer a flat events list. The page derives a signed-in user's personal calendar from shared source collections:

- school-wide events from `events`
- approved or manager-visible group events from `events`
- recurring academic blocks from `scheduleEntries`
- recurring meals from `scheduleEntries`
- dataset readiness from `scheduleDatasets`

The system derives the calendar at read time. It does not duplicate every shared event into each user record.

## Personalization Rules

### School-wide items

- always visible on the personal calendar
- retain their direct links and metadata
- legacy imported events without modern group metadata still fall back to school-wide visibility instead of disappearing

### Group items

- included in the personal calendar only when the user is:
  - an approved member, or
  - a club manager/master/admin for that group
- pending or rejected memberships do not feed group events into the personal calendar
- legacy membership documents without `status` still count as approved
- legacy membership documents that rely on the membership document id instead of a stored `userId` are now recovered by the client query layer
- legacy group events without explicit `visibility` now default to `members`, not `school`

### Academic and meal items

- matched by `grade` and `section` on the user profile
- expanded from recurring `scheduleEntries` into dated instances over the visible calendar window
- left empty on purpose when no real dataset is attached
- shown with readiness-aware empty states so missing datasets do not make the calendar look broken

## Overview vs Expanded Day View

The calendar now has two interaction levels.

### Overview calendar

- month-based, calm, and readable
- school-wide and group events appear as individual items
- academic timetable blocks are condensed into daily summary markers instead of flooding the month grid
- meal schedule items are also condensed in overview mode
- filters support:
  - all
  - academic
  - clubs/societies
  - school-wide
  - meals
  - specific group

### Expanded day view

Clicking a day or event opens a full day sheet with:

- a vertical time-based timeline
- overlap-aware positioning
- classes by block
- meals
- meetings and school events
- overnight and multi-day items remain visible on every day they overlap
- category badges
- author metadata where available
- linked resources where the viewer is allowed to see them

## Membership Visibility Rules

Club membership now supports:

- `pending`
- `approved`
- `rejected`

Effects:

- approved memberships move a club into `My Clubs`
- approved memberships automatically expose that group's events in the personal calendar
- private club links stay hidden in discovery mode and for pending memberships
- managers and admins can approve or reject requests from the club management rail
- private Classroom references, Meet links, Classroom post links, and resource links remain hidden for non-members on private group content

## Join Clubs vs My Clubs

The split is deliberate:

- `Join Clubs` is discovery, request, and pending-state handling
- `My Clubs` is for approved memberships and managed groups only

This keeps calendar composition truthful:

- pending groups are visible as pending requests
- approved groups become part of the user's working set
- only approved groups affect the user's calendar feed

## Placeholder Behavior

If timetable or meal imports do not exist yet, the product should show:

- dataset readiness
- profile mapping status
- intentional empty states

It should not generate fake demo periods or fake meal schedules.

## Legacy Fallbacks

- events fall back from `relatedGroupId` to legacy `clubId`
- missing event author snapshots fall back to older `author*` aliases where available
- posts fall back from `content` to legacy `text`
- multi-day items now appear in later day views based on overlap, not only start date

## Classroom Attachment Model

Clubs now support:

- `classroomLink`
- `classroomCode`
- `classroomCourseId`
- `defaultMeetLink`
- `resourceLinks`

Events now support:

- `classroomLink`
- `classroomCourseId`
- `classroomPostLink`
- `meetLink`
- `resourceLinks`

Convergent remains the source of truth. These are attached references, not a Classroom-owned scheduling model.

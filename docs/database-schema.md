# Firestore Data Model

This document describes the schema the current app actually uses today.

## Canonical Roles
- `student`
- `manager`
- `master`
- `admin`

## Collections
### `users/{userId}`
- `name`
- `email`
- `role`
- `clubsJoined`
- `photoURL`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

### `clubs/{clubId}`
- `name`
- `description`
- `category`
- `mic`
- `schedule`
- `logoUrl`
- `managerIds`
- `memberCount`
- `createdAt`
- `updatedAt`

### `clubs/{clubId}/memberships/{userId}`
- `userId`
- `joinedAt`

### `clubs/{clubId}/posts/{postId}`
- `clubId`
- `authorId`
- `authorName`
- `text`
- `createdAt`

### `events/{eventId}`
- `title`
- `description`
- `startTime`
- `endTime`
- `allDay`
- `location`
- `type`
- `clubId`
- `source`
- `sourceId`
- `sourceDataset`
- `sourceTerm`
- `importBatchId`
- `sourceHash`
- `rsvpCount`
- `createdAt`
- `updatedAt`

### `eventRsvps/{eventId_userId}`
- `eventId`
- `userId`
- `attending`
- `respondedAt`

### `certificates/{certificateId}`
- `clubId`
- `userId`
- `userName`
- `clubName`
- `eventTitle`
- `verifierId`
- `fileUrl`
- `storagePath`
- `uploadedBy`
- `issuedAt`
- `createdAt`

## Current Non-Schema Reality
- Club membership and RSVP aggregates are maintained through callable Functions, not direct client-side aggregate writes.
- New certificate uploads live at `certificates/{clubId}/{userId}/...` in Storage.
- Attendance collections are not implemented.
- Activity logs and reports are not implemented.
- The local Dexie provider uses an older experimental shape and should not be treated as production schema.

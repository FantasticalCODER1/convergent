# Firestore Data Model

This document describes the current Convergent foundation schema after the time-and-structure refactor.

## Canonical Roles
- `student`
- `manager`
- `master`
- `admin`

## Canonical Categories
- `school_wide`
- `academic`
- `club`
- `society`
- `supw`
- `sta`
- `centre_of_excellence`
- `meals`

## Collections
### `users/{userId}`
- `name`
- `email`
- `role`
- `clubsJoined`
- `grade`
- `section`
- `house`
- `residency`
- `scheduleAudienceKey`
- `authProvider`
- `profileCompletedAt`
- `photoURL`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

### `clubs/{groupId}`
- `name`
- `description`
- `category`
- `groupType`
- `mic`
- `schedule`
- `meetingLocation`
- `logoUrl`
- `classroomLink`
- `meetLink`
- `resourceLinks`
- `membershipMode`
- `visibility`
- `managerIds`
- `memberCount`
- `createdAt`
- `updatedAt`

### `clubs/{groupId}/memberships/{userId}`
- `userId`
- `groupId`
- `status`
- `memberRole`
- `approvedBy`
- `approvedAt`
- `joinedAt`
- `createdAt`
- `updatedAt`

### `clubs/{groupId}/posts/{postId}`
- `title`
- `content`
- `category`
- `relatedGroupId`
- `linkedEventId`
- `classroomLink`
- `meetLink`
- `resourceLinks`
- `postedByUid`
- `postedByNameSnapshot`
- `postedByEmailSnapshot`
- `postedByRoleSnapshot`
- `visibility`
- `createdAt`
- `updatedAt`

### `events/{eventId}`
- `title`
- `description`
- `category`
- `scope`
- `relatedGroupId`
- `startTime`
- `endTime`
- `allDay`
- `location`
- `classroomLink`
- `classroomCourseId`
- `meetLink`
- `resourceLinks`
- `attendanceEnabled`
- `createdByUid`
- `createdByNameSnapshot`
- `createdByEmailSnapshot`
- `createdByRoleSnapshot`
- `visibility`
- `sourceMetadata`
- `source`
- `sourceId`
- `sourceDataset`
- `sourceTerm`
- `sourceHash`
- `clubId`
- `type`
- `rsvpCount`
- `createdAt`
- `updatedAt`

### `eventRsvps/{eventId_userId}`
- `eventId`
- `userId`
- `attending`
- `respondedAt`

### `scheduleEntries/{entryId}`
- `scheduleType`
- `category`
- `grade`
- `section`
- `dayOfWeek`
- `blockName`
- `title`
- `teacher`
- `location`
- `startTime`
- `endTime`
- `resourceLinks`
- `sourceDataset`
- `createdAt`
- `updatedAt`

### `scheduleDatasets/{datasetId}`
- `scheduleType`
- `title`
- `audienceLabel`
- `status`
- `sourceDataset`
- `notes`
- `updatedAt`

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

## Operational Notes
- `clubs` remains the backing collection name for now, but the document shape is intended to support broader group-like units, not only traditional clubs.
- Membership is approval-ready in the schema even though most current UI flows are still open/self-serve.
- Events and posts both support Classroom, Meet, and resource links, but posts are intentionally non-timed communication records.
- Timetable and meal data now have reserved collections even when datasets are missing.
- Legacy `clubId` and `type` fields remain on events for backward compatibility with existing rules, tests, and seeded data.

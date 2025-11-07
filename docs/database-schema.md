# Firestore Data Model

## Collections

### `users`
- `displayName` (string)
- `email` (string, unique, domain-restricted)
- `role` (string: `student`, `manager`, `master`, `admin`)
- `houses` (array<string>) – optional for analytics
- `joinedClubs` (array<reference>)
- `hoursLogged` (number)
- `lastLoginAt` (timestamp) – maintained by `refreshUserSession` callable

### `clubs`
- `name` (string)
- `slug` (string, unique)
- `description` (string)
- `logoUrl` (string)
- `frequency` (string)
- `masterInCharge` (string)
- `masterId` (string | null) – UID of the Master-in-Charge
- `managerIds` (array<string>) – UIDs of Boys-in-Charge
- `createdAt` (timestamp)
- `openMembership` (boolean)

### `clubs/{clubId}/events/{eventId}`
- `title` (string)
- `start` (timestamp)
- `end` (timestamp)
- `location` (string)
- `description` (string)
- `category` (string: meeting, competition, rehearsal, etc.)
- `createdBy` (string – UID)
- `updatedAt` (timestamp)
- `qrSlug` (string) – unique slug used for verification URLs

### `clubs/{clubId}/certificates/{certificateId}` & `users/{uid}/certificates/{certificateId}`
- `studentId` (string)
- `clubId` (string)
- `eventId` (string | null)
- `type` (string: participation, leadership, achievement)
- `issuedAt` (timestamp)
- `issuedBy` (string – UID)
- `revoked` (boolean)
- `verificationUrl` (string)

### `clubs/{clubId}/events/{eventId}/attendance/{uid}`
- `status` (string: present, excused, absent)
- `markedBy` (string – UID)
- `method` (string: qr, manual)
- `timestamp` (timestamp)

### `clubs/{clubId}/posts/{postId}`
- `authorId` (string)
- `type` (string: announcement, minutes, resource)
- `content` (string – rich text payload)
- `attachments` (array<string>)
- `createdAt` (timestamp)

### `logs`
- `type` (string: role_change, certificate_issue, attendance_mark, etc.)
- `userId` (string)
- `payload` (map)
- `createdAt` (timestamp)

## Security Roles
Roles are defined in `backend/functions/roles.json` and replicated in the frontend utilities to enable consistent checks. Firebase custom claims ensure every request carries the correct `role`, while Cloud Functions (`onboardUser`, `assignRole`, `refreshUserSession`) synchronize `/users` documents. Security rules enforce that managers and masters may only update clubs where their UID appears in `managerIds` or matches `masterId`, and only admins can mutate global settings.

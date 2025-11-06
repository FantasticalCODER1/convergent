# Firestore Data Model

## Collections

### `users`
- `displayName` (string)
- `email` (string, unique, domain-restricted)
- `role` (string: `student`, `manager`, `master`, `admin`)
- `houses` (array<string>) – optional for analytics
- `joinedClubs` (array<reference>)
- `hoursLogged` (number)

### `clubs`
- `name` (string)
- `slug` (string, unique)
- `description` (string)
- `logoUrl` (string)
- `frequency` (string)
- `masterInCharge` (reference<users>)
- `managers` (array<reference<users>>)
- `createdAt` (timestamp)

### `clubEvents`
- `club` (reference<clubs>)
- `title` (string)
- `startTime` (timestamp)
- `endTime` (timestamp)
- `location` (string)
- `type` (string: meeting, competition, rehearsal, etc.)
- `attendanceCode` (string)
- `qrUrl` (string)

### `certificates`
- `student` (reference<users>)
- `club` (reference<clubs>)
- `event` (reference<clubEvents>)
- `issuedAt` (timestamp)
- `revoked` (boolean)
- `verificationUrl` (string)

### `attendanceLogs`
- `event` (reference<clubEvents>)
- `student` (reference<users>)
- `status` (string: present, excused, absent)
- `scannedAt` (timestamp)
- `hours` (number)

### `clubPosts`
- `club` (reference<clubs>)
- `author` (reference<users>)
- `content` (string)
- `attachments` (array<string>)
- `createdAt` (timestamp)

### `activityLogs`
- `club` (reference<clubs>)
- `type` (string: meeting, certificate, award, etc.)
- `payload` (map)
- `createdAt` (timestamp)

## Security Roles
Roles are defined in `backend/functions/roles.json` and replicated in the frontend utilities to enable consistent checks. Firebase security rules should enforce:
- Students read/write only their attendance RSVPs and profile data.
- Managers manage clubs they are assigned to.
- Masters approve events and certify participation.
- Admins have full read/write access.

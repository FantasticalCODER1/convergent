# Convergent

Convergent is a co-curricular management portal for The Doon School. The current codebase is a Firebase-backed React application with working modules for authentication, clubs, events, calendar, certificates, Google Classroom integration, and an admin panel. Attendance, logs, and reports are not implemented yet.

## Current Product Surface
- Authenticated app shell with protected routing
- Google sign-in with `@doonschool.com` restriction
- Personal calendar with overview month view plus expanded day timeline
- Dashboard, Join Clubs, My Clubs, club detail workspaces, classes, certificates, `/verify`, admin panel
- Firestore-backed clubs, posts, events, RSVPs, users, and certificates
- Storage-backed certificate asset uploads
- Firebase Functions for certificate verification, certificate issuance, admin role updates, membership approval, and attendance review

## Repo Layout
```text
convergent/
├── frontend/   React 18 + Vite + Tailwind client
├── backend/    Firebase rules, indexes, storage rules, and Functions
├── docs/       Truthful architecture, schema, deployment, and audit docs
├── scripts/    Local validation and utility scripts
└── tests/      Minimal automated policy and contract tests
```

## Roles
The canonical roles are:
- `student`
- `manager`
- `master`
- `admin`

`teacher` is only treated as a legacy compatibility value during migration and should not be written going forward.

## Local Development
### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure environment
Create `frontend/.env.local` from `frontend/.env.example` and populate Firebase + Google OAuth values.

### 3. Start the frontend
```bash
cd frontend
npm run dev
```

### 4. Start Firebase emulators
The repo expects the Firebase CLI to be installed locally.
```bash
cd backend
npm run serve:functions
```

If you want the frontend to point at emulators, set `VITE_USE_FIREBASE_EMULATORS=true` in `frontend/.env.local`.

## Validation Commands
```bash
npm run lint
npm run test
npm run check
```

- `lint`: repo-native static validation for frontend/backend plus truth-doc checks
- `test`: minimal automated tests for role policy and backend/frontend contract assumptions
- `check`: frontend typecheck and production build

## Current Gaps
The following areas are intentionally not represented as shipped features:
- Attendance workflows
- Logs and reports
- Analytics
- Offline-first local provider as a production data path

## Documentation
- [Architecture](docs/architecture.md)
- [Personal Calendar](docs/personal-calendar.md)
- [Database Schema](docs/database-schema.md)
- [Deployment](docs/deployment.md)
- [Production Audit](docs/production-audit.md)

## License
[MIT](LICENSE)

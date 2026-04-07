# Convergent - The Co-Curricular Hub

Convergent is a full-stack platform built for schools to consolidate all co-curricular activities into a unified, student-friendly portal. The experience blends the minimalism of Notion with the collaboration of Google Classroom, empowering students, Boy-in-Charge managers, Masters-in-Charge, and administrators to manage clubs, events, certificates, and attendance from a single source of truth.

## ✨ Product Vision
- **Centralize participation**: Discover clubs, RSVP to events, and view attendance history effortlessly.
- **Celebrate achievements**: Issue digitally-verifiable certificates with QR validation.
- **Automate reporting**: Generate analytics and end-of-term summaries for every activity.
- **Scale with the school**: Firebase-first architecture designed for 800+ users on free tiers.

## 🏗️ Architecture Overview
Convergent is organized as a monorepo with decoupled frontend and backend services.

```
convergent/
├── frontend/        # Vite + React + Tailwind interface, Firebase Auth & Firestore clients
├── backend/         # Firebase Functions for certificates, attendance, role orchestration
├── docs/            # Architecture, database schema, and deployment playbooks
├── .github/         # CI automation for frontend validation
└── package.json     # Workspace-level scripts for tooling and automation
```

### Core Technologies
| Layer | Stack | Purpose |
| --- | --- | --- |
| Frontend | React 18, Vite, Tailwind CSS | Responsive UI, role-aware routing, PDF/QR generation |
| Backend | Firebase Functions, Firestore, Firebase Auth | Secure serverless APIs, certificate issuance, attendance webhooks |
| Tooling | TypeScript, GitHub Actions | Type checks, production builds, and repository validation |
| PDF & QR | jsPDF, canvas-confetti, qrcode | Certificate exports with celebratory feedback |

## 🚀 Getting Started
### 1. Clone & Install
```bash
git clone https://github.com/FantasticalCODER1/convergent.git
cd convergent
npm run install:all
```

### 2. Environment Variables
Create `frontend/.env.local` and populate the Firebase credentials provided by the school domain administrator.
```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Local Development
```bash
# start the React development server (localhost:5173)
cd frontend
npm run dev

# in another terminal, start Firebase emulators
cd ../backend
npm run serve:functions
```

### 4. Project Checks
```bash
# root-level commands for CI and Codex
npm run check
```

### 5. Frontend Validation
```bash
cd frontend
npm run typecheck
npm run build
```

### 6. GitHub + Codex App Workflow
- Keep the project in the GitHub repository at `FantasticalCODER1/convergent`.
- Open the repository from the Codex app through GitHub so Codex works against the same branch history and pull requests.
- Use `main` as the working baseline unless you intentionally need an isolated branch.
- Run `npm run check` before pushing changes.
- Store secrets only in local `.env.local` files or GitHub repository secrets, never in tracked files.

### 7. Production Build & Deployment
```bash
npm run build

cd frontend
npm run preview      # optional local preview of the production build

cd ../backend
npm run deploy       # deploys Firebase Functions & hosting via GitHub Actions
```

## 🔐 Role-Based Access
| Role | Capabilities |
| --- | --- |
| Student | View joined clubs, RSVP to events, download certificates |
| Manager (Boy-in-Charge) | Create posts/events, take attendance, issue certificates |
| Master-in-Charge | Oversee club activity, approve reports, manage resources |
| Admin | Global oversight, assign managers, access analytics |

Permissions are defined centrally in `backend/functions/roles.json` and mirrored in frontend utilities for consistent checks.

## 🗂️ Documentation
- [`docs/architecture.md`](docs/architecture.md) – System topology, sequence diagrams, and deployment flow.
- [`docs/database-schema.md`](docs/database-schema.md) – Firestore collections, data models, and indexes.
- [`docs/deployment.md`](docs/deployment.md) – Firebase + Vercel deployment pipeline with GitHub Actions integration.

## 📈 Roadmap Highlights
- AI-powered club activity summaries for newsletters.
- Advanced participation analytics by house, club, and term.
- Offline-first mobile experiences for quick attendance scans.

Contributions, suggestions, and bug reports are welcome via issues or pull requests.

## 📄 License
Released under the [MIT License](LICENSE).

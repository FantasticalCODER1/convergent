# Convergent – The Co-Curricular Hub

Convergent is a full-stack platform built for schools to consolidate all co-curricular activities into a unified, student-friendly portal. The experience blends the minimalism of Notion with the collaboration of Google Classroom, empowering students, Boy-in-Charge managers, Masters-in-Charge, and administrators to manage clubs, events, certificates, and attendance from a single source of truth.

## ✨ Product Vision
- **Centralize participation** – Discover clubs, RSVP to events, and view attendance history effortlessly.
- **Celebrate achievements** – Issue digitally-verifiable certificates with QR validation.
- **Automate reporting** – Generate analytics and end-of-term summaries for every activity.
- **Scale with the school** – Firebase-first architecture designed for 800+ users on free tiers.

## 🏗️ Architecture Overview
Convergent is organized as a monorepo with decoupled frontend and backend services.

```
convergent/
├── frontend/        # Vite + React + Tailwind interface, Firebase Auth & Firestore clients
├── backend/         # Firebase Functions for certificates, attendance, role orchestration
├── docs/            # Architecture, database schema, and deployment playbooks
├── .github/         # CI/CD automation for Firebase Hosting deployments
├── .husky/          # Git hooks for formatting & changelog automation
└── package.json     # Workspace-level scripts for tooling and automation
```

### Core Technologies
| Layer | Stack | Purpose |
| --- | --- | --- |
| Frontend | React 18, Vite, Tailwind CSS | Responsive UI, role-aware routing, PDF/QR generation |
| Backend | Firebase Functions, Firestore, Firebase Auth | Secure serverless APIs, certificate issuance, attendance webhooks |
| Tooling | ESLint, Prettier, Husky, GitHub Actions | Automated linting, formatting, changelog & deployment pipelines |
| PDF & QR | jsPDF, canvas-confetti, qrcode | Certificate exports with celebratory feedback |

## 🚀 Getting Started
### 1. Clone & Install
```bash
# clone the repository
git clone https://github.com/<org>/convergent.git
cd convergent

# install frontend and backend dependencies
npm run install:all
```

### 2. Environment Variables
Create `frontend/.env` and populate the Firebase credentials provided by the school domain administrator.
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

> Formatting is enforced via Husky: commits trigger `npm run format`, and changelog versioning runs automatically after each commit.

### 4. Linting & Formatting
```bash
cd frontend
npm run lint
npm run format

cd ../backend
npm run lint
npm run format
```

### 5. Production Build & Deployment
```bash
cd frontend
npm run build
npm run serve        # optional local preview of the production build

cd ../backend
npm run deploy       # deploys Firebase Functions & hosting via GitHub Actions
firebase deploy --only firestore:rules
```

## 🔐 Role-Based Access
| Role | Capabilities |
| --- | --- |
| Student | View joined clubs, RSVP to events, download certificates |
| Manager (Boy-in-Charge) | Create posts/events, take attendance for assigned clubs |
| Master-in-Charge | Manage resources, certify participation for assigned clubs |
| Admin | Global oversight, assign roles, manage analytics |

Permissions are defined centrally in `backend/functions/roles.json` and enforced through Firebase custom claims. Cloud Functions (`onboardUser`, `assignRole`, `refreshUserSession`) keep `/users` documents aligned with claim updates, while Firestore security rules ensure managers/masters only modify clubs where they are explicitly listed.

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

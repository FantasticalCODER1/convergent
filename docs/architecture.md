# Convergent Architecture Overview

## System Diagram
```
[Google Identity] --> [Firebase Auth] --> [Convergent Frontend]
                                      \-> [Firestore]
                                      \-> [Cloud Storage]
                       [Cloud Functions] <-> [Firestore]
                               |
                          [GitHub Actions] --> [Firebase Hosting]
```

## Frontend
- **Framework**: React 18 + Vite for fast bundling and module-based routing.
- **Styling**: Tailwind CSS with custom brand tokens.
- **State**: React context for auth; future slices for clubs, events, and analytics.
- **PDF/QR**: jsPDF for client-side export, `canvas-confetti` for celebratory feedback, `qrcode` for validation codes.

## Backend
- **Platform**: Firebase Functions (Node 18 runtime) orchestrating certificates, attendance, and seeding.
- **Database**: Firestore in Native mode structured around clubs, events, certificates, and logs.
- **Storage**: Firebase Storage for logos, resources, and generated certificates.
- **Security**: Role definitions in `roles.json`, mirrored to frontend utilities for consistent access control.

## DevOps & Tooling
- **CI/CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`) validating the frontend on pushes to `main`.
- **Code Quality**: TypeScript compile checks and production builds from the repo root.
- **Docs & Governance**: CHANGELOG for versioning, MIT License for open collaboration.

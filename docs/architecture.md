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
- **Styling**: Tailwind CSS with custom brand tokens and Prettier sorting.
- **State**: React context for auth; future slices for clubs, events, and analytics.
- **PDF/QR**: jsPDF for client-side export, `canvas-confetti` for celebratory feedback, `qrcode` for validation codes.

## Backend
- **Platform**: Firebase Functions (Node 18 runtime) orchestrating certificates, attendance, and seeding.
- **Database**: Firestore in Native mode structured around clubs, events, certificates, and logs.
- **Storage**: Firebase Storage for logos, resources, and generated certificates.
- **Security**: Role definitions in `roles.json`, mirrored to frontend utilities and enforced through Firebase custom claims + security rules. Cloud Functions issue and refresh claims while syncing `/users` documents for audit trails.

## DevOps & Tooling
- **CI/CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`) deploying hosting & functions on push.
- **Code Quality**: ESLint, Prettier, Husky hooks for formatting and changelog synchronization.
- **Docs & Governance**: CHANGELOG for versioning, MIT License for open collaboration.

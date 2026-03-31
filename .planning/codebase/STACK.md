# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript ~5.9.3 - Frontend application and type safety across all components
- JavaScript (Node.js) - Cloud Functions and build tooling

**Secondary:**
- HTML5 - PWA manifest and structure
- CSS3 - Tailwind CSS styling

## Runtime

**Environment:**
- Node.js 20 (specified in `familyquest/functions/package.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present in both root and functions directories

## Frameworks

**Core:**
- React 19.2.4 - UI framework for web application
- React Router 6.30.3 - Client-side routing and navigation

**Build/Development:**
- Vite 8.0.1 - Build tool and dev server with HMR
- Vite PWA Plugin 1.2.0 - Progressive Web App generation with Workbox integration

**Backend/Automation:**
- Firebase Cloud Functions 6.0.0 - Serverless function execution
- Firebase Admin SDK 12.0.0 - Server-side Firebase operations in Cloud Functions

## Key Dependencies

**Critical:**
- firebase 10.14.1 - Modular Firebase SDK for Auth, Firestore, Storage, Messaging
- react-dom 19.2.4 - React DOM rendering
- zustand 5.0.12 - Lightweight state management (authStore, familyStore, notificationStore)
- react-hook-form 7.72.0 - Performant form handling
- @hookform/resolvers 5.2.2 - Zod integration with React Hook Form

**Validation & Schema:**
- zod 4.3.6 - TypeScript-first schema validation for API and form data

**Data Visualization:**
- recharts 3.8.1 - Composable React charting library for dashboards and performance graphs

**UI & Effects:**
- canvas-confetti 1.9.4 - Confetti animation on prize redemption
- workbox-window 7.4.0 - Client-side Workbox API for service worker control
- react-is 19.2.4 - React type utilities

**Styling:**
- tailwindcss 3.4.19 - Utility-first CSS framework
- autoprefixer 10.4.27 - PostCSS vendor prefix plugin
- postcss 8.5.8 - CSS transformation pipeline

## Development Dependencies

**Linting & Code Quality:**
- eslint 9.39.4 - JavaScript/TypeScript linter
- @eslint/js 9.39.4 - ESLint core rules
- typescript-eslint 8.57.0 - TypeScript-aware ESLint
- eslint-plugin-react-hooks 7.0.1 - React Hooks linting
- eslint-plugin-react-refresh 0.5.2 - Fast Refresh compatibility check

**TypeScript Tooling:**
- typescript 5.9.3 - TypeScript compiler (strict mode, source maps disabled in prod)
- @types/react 19.2.14 - React type definitions
- @types/react-dom 19.2.3 - React DOM type definitions
- @types/node 24.12.0 (root) and 20.11.5 (functions) - Node.js type definitions
- @types/canvas-confetti 1.9.0 - Canvas Confetti type definitions

**Build & Transpilation:**
- @vitejs/plugin-react 6.0.1 - Vite React JSX plugin
- vite 8.0.1 - Vite development and build server

**Utilities:**
- globals 17.4.0 - Global variable definitions for ESLint

## Configuration

**Environment:**
- `.env.local` file (not tracked in git) contains Firebase configuration:
  - `VITE_FIREBASE_API_KEY` - Public API key
  - `VITE_FIREBASE_AUTH_DOMAIN` - Auth domain
  - `VITE_FIREBASE_PROJECT_ID` - Project ID
  - `VITE_FIREBASE_STORAGE_BUCKET` - Storage bucket
  - `VITE_FIREBASE_MESSAGING_SENDER_ID` - FCM sender ID
  - `VITE_FIREBASE_APP_ID` - Firebase app ID
  - `VITE_FIREBASE_VAPID_KEY` - FCM VAPID public key

**Build Configuration:**
- `vite.config.ts` - Vite build config with PWA plugin and React support
- `tsconfig.json` and `tsconfig.app.json`, `tsconfig.node.json` - TypeScript compiler configuration
- `tailwind.config.js` - Tailwind CSS with Material Design 3 color system, custom fonts (Be Vietnam Pro, Plus Jakarta Sans)
- `eslint.config.js` - Flat config with recommended + React rules
- `firebase.json` - Firebase deployment configuration for Hosting, Functions, Firestore, and Auth
- `.firebaserc` - Firebase project defaults (familyquest-yurir)

**PWA Configuration:**
- `public/manifest.json` - PWA manifest with theme color `#6366F1`, Portuguese language, standalone display mode
- `public/firebase-messaging-sw.js` - Generated service worker for Firebase Cloud Messaging
- Icons: `icon-192.png` and `icon-512.png` in public directory

## Platform Requirements

**Development:**
- Node.js 20 (enforced in functions/package.json)
- npm (or compatible package manager)
- Firebase CLI for local emulation and deployment

**Production:**
- Firebase Hosting - PWA deployment target
- Firebase Firestore database in `us-east1` location
- Firebase Cloud Functions in `southamerica-east1` region (optimized for Brazil timezone)
- Firebase Authentication (Email/Password provider)
- Firebase Cloud Messaging (FCM) for push notifications
- Firebase Storage (implicit - available but code uses in-browser compression to data URLs)

---

*Stack analysis: 2026-03-31*

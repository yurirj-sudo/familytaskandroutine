# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**Firebase Cloud Messaging (FCM):**
- Service: Firebase Cloud Messaging (Google Cloud)
- What it's used for: Push notifications to mobile browsers and PWA users
  - Task reminders 15 minutes before due time
  - Task approval/rejection status updates
  - Prize redemption confirmations
  - Cycle closing and monthly summaries
- SDK/Client: `firebase/messaging` (v10.14.1)
- Backend: Cloud Functions trigger `scheduledSendTaskReminders` runs every 15 minutes via Pub/Sub
- Configuration:
  - VAPID key: `VITE_FIREBASE_VAPID_KEY` (frontend FCM token registration)
  - Service worker: `src/firebase-messaging-sw.ts` handles background messages via `onBackgroundMessage`
  - Token storage: Persisted in `families/{familyId}/members/{uid}` document field `fcmToken`
- Implementation: `src/services/fcm.service.ts` with permission handling and iOS PWA detection

**No Third-Party Analytics:** Not detected. Application does not integrate external analytics services.

**No Third-Party Payment:** Prizes use internal points system; no payment processor integration.

## Data Storage

**Primary Database:**
- Type/Provider: Firestore (Firebase Cloud Database)
- Connection: Project-based via Firebase SDK v10.14.1
  - Config: `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`
  - Client: `firebase/firestore` modular SDK
  - Offline support: Persistent local cache with multi-tab manager (configured in `src/firebase.ts`)
- Collections/Structure:
  - `/families/{familyId}` - Family metadata, settings, invite codes
  - `/families/{familyId}/members/{uid}` - Family members with roles, points, streaks, FCM tokens
  - `/families/{familyId}/tasks/{taskId}` - Task definitions with recurrence patterns
  - `/families/{familyId}/completions/{id}` - Daily task completion records (status: pending/submitted/approved/rejected/completed/missed)
  - `/families/{familyId}/prizes/{prizeId}` - Prize catalog with point costs
  - `/families/{familyId}/redemptions/{id}` - Prize redemption history
  - `/families/{familyId}/cycles/{id}` - Monthly point cycle aggregations
  - `/users/{uid}` - Global user profiles for multi-family lookup
- Location: `us-east1` (specified in firebase.json)
- Transactions: Used for atomic operations:
  - Prize redemption (points debit + quantity increment) in `src/services/redemption.service.ts`
  - Approval of task completions with point credit in Cloud Functions

**Photo Proof Storage:**
- Approach: In-browser compression to data URLs (base64), stored directly in Firestore documents
- Client: `src/utils/imageCompress.ts` (image compression utility)
- Service: `src/services/storage.service.ts` handles compression and returns data URL
- Rationale: Keeps within Firestore 1 MB document limit; avoids Firebase Storage costs for free tier

**Caching & Offline:**
- Strategy: Firestore persistent local cache with IndexedDB
- Configuration: Multi-tab manager enabled (`persistentMultipleTabManager`) to coordinate cache across browser tabs
- Syncing: Automatic sync on reconnection via Firestore SDK

## Authentication & Identity

**Auth Provider:**
- Service: Firebase Authentication (Google Cloud)
- Implementation: Email + Password authentication
- Configuration: Enabled via `firebase.json` auth provider settings
- Client: `firebase/auth` modular SDK
- Methods:
  - `signInWithEmailAndPassword()` - Login with email/password
  - `createUserWithEmailAndPassword()` - Account creation (admin or member)
  - `signOut()` - Logout
  - `updateProfile()` - Set display name after registration
- Custom Claims: Not detected; familyId passed via Firestore lookup or document storage
- Session: Firebase Auth session persisted in browser; auth state subscriptions via `onAuthStateChanged()`
- Signup Flow:
  1. Admin: Creates auth account + family + admin member record
  2. Member: Creates auth account + joins via invite code lookup + member record created
  3. Both flows: User profile stored in `/users/{uid}` and family member record in `/families/{familyId}/members/{uid}`
- Services: `src/services/auth.service.ts` - `loginWithEmail()`, `registerAdmin()`, `joinFamily()`, `logout()`

## Security Rules & Access Control

**Firestore Security Rules:** `firestore.rules` (referenced in firebase.json)
- Member verification: `isMember(familyId)` - checks presence in `/families/{familyId}/members/{uid}`
- Admin verification: `isAdmin(familyId)` - checks role field equals 'admin'
- Scope: All collections use `familyId` as isolation boundary
- Write rules: Admin-only for mutations except:
  - Members can create/update own completions (status submission)
  - Members can create own redemption requests
  - Members can update own profile fields

## Monitoring & Observability

**Error Tracking:**
- Service: Not integrated. Errors logged to browser console via `console.warn()`, `console.error()`
- Cloud Functions: No dedicated error tracking; failures trigger Firebase function logs via `firebase functions:log` CLI

**Logs:**
- Frontend: Console logs (browser DevTools)
- Cloud Functions: Firebase function logs accessible via Firebase Console or CLI
- Service Worker: Limited to background message handling; errors not explicitly tracked

**Performance Monitoring:**
- Not detected. Application does not integrate Firestore Performance Monitoring or Google Analytics.

## CI/CD & Deployment

**Hosting:**
- Platform: Firebase Hosting
- Configuration: `firebase.json` specifies `dist` directory as public root
- Rewrite rules: All routes rewritten to `/index.html` for SPA routing
- Build output: `npm run build` produces `dist/` directory

**Deployment Scripts:**
- Frontend: `firebase deploy` (or `firebase deploy --only hosting`) deploys to Firebase Hosting
- Cloud Functions: `firebase deploy --only functions` deploys functions from `functions/src/` to `southamerica-east1` region
- Functions build: TypeScript compiled to JavaScript via `npm run build` in functions directory
- Function source: Compiled from `functions/src/` to `functions/lib/` (not tracked in git per `.gitignore`)

**CI Pipeline:**
- Not detected. Repository shows no GitHub Actions, CircleCI, or similar CI configuration.
- Manual deployments via `firebase deploy` CLI

## Scheduled Jobs (Cloud Functions)

**Pub/Sub Scheduled Triggers:**
- All run in `southamerica-east1` region (optimized for Brazil timezone)
- Timezone: UTC scheduling; functions check local family timezone

| Function | Schedule | Purpose |
|----------|----------|---------|
| `scheduledGenerateDailyCompletions` | `1 3 * * *` (00:01 BRT) | Creates `pending` completion records for all due tasks daily |
| `scheduledProcessMissedTasks` | `5 3 * * *` (00:05 BRT) | Marks incomplete tasks as `missed` and applies point penalties |
| `scheduledCloseMonthCycle` | `10 3 1 * *` (00:10 on 1st) | Aggregates monthly stats, resets points (monthly_reset mode), opens new cycle |
| `scheduledSendTaskReminders` | `*/15 * * * *` | Sends FCM reminders for tasks due in next 15 minutes |
| `onCompletionApproved` | Firestore trigger on `/families/{familyId}/completions` | Triggered on status change to 'approved' or 'completed'; credits points, updates streak |

**Firestore Triggers:**
- Document path: `/families/{familyId}/completions/{completionId}`
- Event: Document update (status field changes)
- Handler: `handleCompletionUpdate()` in `functions/src/onCompletionApproved.ts`
- Operations: Point credit, streak calculation, FCM notification send

## Webhooks & Callbacks

**Incoming Webhooks:**
- Not detected. Application does not expose HTTP endpoints for external webhooks.

**Outgoing Webhooks:**
- Not detected. Application does not send webhooks to external services.

**FCM Callbacks:**
- Service Worker: `notificationclick` event listener in `src/firebase-messaging-sw.ts`
- Behavior: On notification click, focuses existing app window or opens `/home` route

## Environment Configuration

**Required Environment Variables:**
All prefixed with `VITE_` for frontend visibility:
- `VITE_FIREBASE_API_KEY` - Firebase public API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Auth domain (e.g., `familyquest-yurir.firebaseapp.com`)
- `VITE_FIREBASE_PROJECT_ID` - Project ID (e.g., `familyquest-yurir`)
- `VITE_FIREBASE_STORAGE_BUCKET` - Storage bucket (e.g., `familyquest-yurir.firebasestorage.app`)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - FCM sender ID (numeric)
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_FIREBASE_VAPID_KEY` - FCM VAPID public key (required for browser push)

**Secrets Location:**
- `.env.local` file (never committed; listed in `.gitignore`)
- Template: `.env.example` shows required variables without values
- Cloud Functions: Firebase ADC (Application Default Credentials) via service account in deployment

**Runtime Configuration:**
- Family settings stored in Firestore: `pointsMode`, `requireTaskApproval`, `requirePhotoProof`, `timezone`, `notificationsEnabled`
- No additional config files required at runtime

---

*Integration audit: 2026-03-31*

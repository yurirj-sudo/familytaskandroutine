# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Layered client-server architecture with Firebase BaaS backend, real-time data synchronization, and scheduled task automation.

**Key Characteristics:**
- Multi-tenant design with `familyId` isolation at all layers
- Real-time Firestore listeners for reactive UI updates
- Server-side transaction semantics for points/redemptions (atomic operations)
- Scheduled Cloud Functions for recurring business logic (daily completions, missed task penalties, cycle closure)
- Zustand global state for authentication and family context
- React Router with role-based route protection (Admin, Member, Viewer)
- PWA with offline persistence via Firestore local cache

## Layers

**Presentation Layer (React UI):**
- Purpose: Render pages and components; dispatch actions via services; display real-time data from Zustand stores
- Location: `src/pages/`, `src/components/`
- Contains: Page components, UI components, layout wrappers, form components
- Depends on: Zustand stores, custom hooks, services, types
- Used by: Browser/PWA client

**Custom Hooks Layer:**
- Purpose: Encapsulate real-time data subscription and business logic combinations
- Location: `src/hooks/`
- Contains: `useTasks`, `useTodayTasks`, `useCompletions`, `usePrizes`, `useCycle`, `useThemeColors`
- Depends on: Services, utilities (recurrence), types
- Used by: Page components

**State Management (Zustand):**
- Purpose: Global auth state, current member/family, multi-family member list
- Location: `src/store/`
- Contains: `authStore.ts` (Firebase user, current member, family, loading states), `familyStore.ts` (all family members list)
- Depends on: Types, Firebase Auth
- Used by: All pages and components (via selectors like `useCurrentMember()`, `useIsAdmin()`)

**Services Layer (Data Access):**
- Purpose: Direct Firestore operations (CRUD, queries, transactions, batch operations, real-time listeners)
- Location: `src/services/`
- Contains: `auth.service.ts`, `task.service.ts`, `completion.service.ts`, `prize.service.ts`, `redemption.service.ts`, `cycle.service.ts`, `family.service.ts`, `storage.service.ts` (Firebase Storage), `fcm.service.ts` (Firebase Cloud Messaging)
- Depends on: Firebase SDK (modular), types, utilities
- Used by: Hooks, pages (for form submissions)

**Utilities Layer:**
- Purpose: Pure functions for date math, recurrence logic, points calculations, theme switching, image compression
- Location: `src/utils/`
- Contains: `recurrence.ts` (task due date logic), `date.ts`, `points.ts`, `theme.ts`, `imageCompress.ts`
- Depends on: Types only
- Used by: Services, hooks, components

**Types Layer:**
- Purpose: Centralized TypeScript interfaces matching Firestore schema
- Location: `src/types/index.ts`
- Contains: Family, Member, Task, Completion, Prize, Redemption, Cycle, AppUser interfaces
- Depends on: Firebase Firestore (Timestamp type)
- Used by: All layers

**Routing Layer:**
- Purpose: Protect routes by authentication and role; lazy-load pages
- Location: `src/router/`
- Contains: Router configuration, `ProtectedRoute` (auth guard), `RoleRoute` (role-based access control)
- Depends on: React Router, Zustand auth store, pages
- Used by: `App.tsx`

**Backend Layer (Firebase Cloud Functions):**
- Purpose: Server-side automation, atomic transactions, scheduled tasks
- Location: `functions/src/`
- Contains: `generateDailyCompletions.ts`, `processMissedTasks.ts`, `onCompletionApproved.ts`, `closeMonthCycle.ts`, `sendTaskReminders.ts`
- Depends on: Firebase Admin SDK, Node.js
- Used by: Firestore triggers, Cloud Scheduler

**Firebase Foundation:**
- Purpose: Centralized initialization and configuration
- Location: `src/firebase.ts`
- Contains: Firebase app, Auth, Firestore (with offline persistence)
- Depends on: Firebase SDK modular imports, environment variables
- Used by: All services, App.tsx

## Data Flow

**Authentication Flow:**

1. User navigates to `/login` or `/register` (public routes)
2. `LoginPage` or `RegisterPage` calls `auth.service.signIn()` or `auth.service.registerAdmin()`
3. Firebase Auth emits `onAuthStateChanged`
4. `App.tsx` captures auth state, loads `/users/{uid}` doc to get `familyId`
5. Real-time listeners subscribe to `members/{uid}` and `families/{familyId}` docs
6. Zustand `authStore` updates with `firebaseUser`, `member`, `family`
7. `ProtectedRoute` allows access once `loading: false` and `firebaseUser !== null`
8. `RoleRoute` checks `member.role` for admin-only sections

**Task Display Flow:**

1. `HomePage` calls `useTodayTasks(familyId, userId)` hook
2. Hook calls `subscribeActiveTasks()` service → real-time listener on `tasks` collection
3. Hook filters tasks via `isTaskDueToday()` utility (handles daily, weekly, monthly, monthly_relative, once)
4. Splits into `mandatory` and `optional` arrays
5. `useTodayCompletions()` hook subscribes to today's completions in parallel
6. `completionMap` (Map<taskId, Completion>) correlates tasks with status
7. `TaskCard` renders each task with status indicator and completion button
8. UI updates reactively as Firestore data changes

**Completion Submission Flow (with approval enabled):**

1. Member clicks "Marcar como feita" on task
2. `CompletionButton` calls `completion.service.submitCompletion()`
3. Service creates/updates `completions/{id}` with `status: 'submitted'` + `photoProofUrl` (if required)
4. Firestore trigger `onCompletionStatusChanged` fires (but no-op for 'submitted' status)
5. Admin sees pending approval in `ApprovalsPage` (real-time listener on `status: 'submitted'` completions)
6. Admin clicks "Aprovar" → calls `completion.service.approveCompletion()`
7. Updates status to `approved` and sets points
8. Trigger fires → `handleCompletionUpdate()` Cloud Function executes:
   - Credits `member.totalPoints` via transaction
   - Recalculates streak (consecutive mandatory completions)
   - Sends FCM notification to member
9. Member sees updated balance and completion status on `HomePage` (Firestore listener pushes update)

**Completion Submission Flow (without approval):**

1. Member marks task complete
2. Service sets `status: 'completed'` + `pointsAwarded` immediately
3. Trigger fires → Cloud Function credits points + recalculates streak
4. Member sees points updated in real-time on UI

**Prize Redemption Flow:**

1. Member views `PrizesPage` (calls `usePrizes()` hook → real-time listener on `prizes` collection)
2. Member clicks "Resgatar" on prize
3. `RedeemModal` calls `redemption.service.redeemPrize(familyId, userId, prizeId)`
4. Service executes Firestore transaction:
   - Reads `members/{uid}` and `prizes/{prizeId}` atomically
   - Checks `totalPoints >= pointsCost` and quantity available
   - Decrements `member.totalPoints` by `pointsCost`
   - Increments `prize.quantityRedeemed`
   - Creates new `redemptions/{id}` doc with `status: 'approved'` (always automatic)
5. Transaction succeeds or fails atomically (no partial writes)
6. Member sees updated balance on `PointsPage` (real-time listener)
7. FCM push notification sent (if enabled)

**Daily Task Generation & Penalties (Cloud Functions):**

1. Every day at 00:01 BRT: `generateDailyCompletions` scheduler runs
   - For each family: queries all `tasks` with `isActive: true`
   - For each task and assigned member: calculates if due today (using `recurrence.ts`)
   - Creates/upserts `completions/{taskId}_{uid}_{YYYY-MM-DD}` with `status: 'pending'`
   - ID is deterministic → function is idempotent (safe to re-run)
2. At 00:05 BRT: `processMissedTasks` scheduler runs
   - Queries completions from yesterday with `status: 'pending'` or `submitted`
   - Sets `status: 'missed'` for all
   - For mandatory tasks: deducts `pointsOnMiss` from `totalPoints` via transaction
   - Sends FCM notification to member
3. At day-end: Completion status frozen; late submissions blocked

**Monthly Cycle Closure (Cloud Functions):**

1. On 1st of month at 00:10 BRT: `closeMonthCycle` scheduler runs
2. For previous month: aggregates all completions per member (earned, lost, spent)
3. Creates/updates `cycles/{cycleId}` doc with summary stats
4. If family has `pointsMode: 'monthly_reset'`: resets `member.totalPoints` to 0
5. If family has `pointsMode: 'accumulate'`: leaves points as-is
6. Sends FCM digest notification to all family members

**State Management:**

- `authStore` holds auth state; selectors `useCurrentMember()`, `useIsAdmin()`, etc. prevent prop drilling
- Real-time Firestore listeners are managed by service functions and returned from hooks
- On route change, relevant listeners are cleaned up via hook dependencies
- Multiple hooks can subscribe to same collection; Firebase SDK batches subscriptions efficiently
- Offline: Firestore local cache allows reading cached data; mutations queue and sync on reconnect

## Key Abstractions

**Recurrence Algorithm:**
- Purpose: Calculate if a task is due on a specific date (daily, weekly, monthly, monthly_relative, once)
- Examples: `src/utils/recurrence.ts`, `functions/src/recurrence.ts`
- Pattern: Pure functions `isTaskDueToday()`, `getNextOccurrences()` — no side effects; reused in both frontend (UI filtering) and backend (daily generation)

**Completion ID (Deterministic):**
- Purpose: Ensure daily completion generation is idempotent
- Format: `{taskId}_{uid}_{YYYY-MM-DD}` (e.g., `task123_user456_2026-03-31`)
- Pattern: Allows safe re-execution of Cloud Function without duplicates

**Real-Time Data Binding via Hooks:**
- Purpose: Encapsulate Firestore listeners and emit updates
- Examples: `useCompletions()`, `useTasks()`, `usePrizes()`
- Pattern: Hook calls service's `subscribe*()` function; service returns `Unsubscribe` callback; hook cleans up on unmount

**Firestore Transactions for Atomicity:**
- Purpose: Ensure points/redemptions are atomic (no partial updates)
- Examples: `redemption.service.redeemPrize()`, Cloud Function `onCompletionApproved`
- Pattern: `runTransaction()` wraps all reads + all writes; entire operation succeeds or fails together

**Role-Based Route Protection:**
- Purpose: Restrict admin pages from non-admin members
- Examples: `RoleRoute` checks `member.role` and `ProtectedRoute` checks auth
- Pattern: Nested route wrappers; unauthorized access redirects to fallback route

## Entry Points

**Web App Entry:**
- Location: `src/main.tsx`
- Triggers: Browser load of `index.html`
- Responsibilities: Mount React app, initialize DOM root

**App Initialization:**
- Location: `src/App.tsx` → `App` component
- Triggers: On first render
- Responsibilities: Set up Firebase auth listener, subscribe to user + member + family docs, initialize FCM (if permission granted), provide Zustand stores to all children

**Router Initialization:**
- Location: `src/router/index.tsx` → `createBrowserRouter()`
- Triggers: Wrap in `RouterProvider` in `App.tsx`
- Responsibilities: Define all routes, lazy-load pages, apply `ProtectedRoute` and `RoleRoute` guards

**Page Components:**
- Location: `src/pages/*/`
- Examples: `HomePage`, `DashboardPage`, `TasksPage`, `PrizesPage`
- Responsibilities: Orchestrate hooks, fetch data, render UI, handle user input

**Cloud Functions:**
- Location: `functions/src/`
- Examples: `generateDailyCompletions`, `processMissedTasks`, `closeMonthCycle`, `sendTaskReminders`
- Triggers: Firestore document updates (e.g., `onCompletionStatusChanged`) or Cloud Scheduler (pubsub)
- Responsibilities: Server-side logic (transactions, points crediting, streak calculation, notifications)

## Error Handling

**Strategy:** Service functions throw descriptive errors; components catch and display toast/modal to user. No global error boundary currently implemented.

**Patterns:**

- Firestore write errors (e.g., permission denied, document not found): Service throws with message → page catches and shows toast
- Transaction aborts (e.g., insufficient points): `runTransaction()` throws → component catches → shows "Pontos insuficientes" message
- FCM token refresh failures: Silently retry on background; user can grant permission manually via `PushPermissionBanner`
- Offline writes: Queued locally by Firestore; auto-sync on reconnect (transparent to app)

## Cross-Cutting Concerns

**Logging:** `console.log()` in development; Firebase Functions SDK logs to Cloud Logging; no structured logging library currently.

**Validation:** Zod is imported in `package.json` but validation primarily happens server-side (Firestore Security Rules) and via TypeScript types.

**Authentication:** Firebase Auth (email/password) → custom claims can be set for familyId (planned for performance optimization of Security Rules).

**Authorization:** Firestore Security Rules enforce read/write access per `familyId` and `role`. Client-side `RoleRoute` is UX only; Rules are the source of truth.

**Notifications:** Firebase Cloud Messaging (FCM) for push notifications; subscribed via `fcm.service.ts`; sent by Cloud Functions on events (task reminders, approval status, cycle closure).

**Multi-tenancy:** `familyId` is present on all documents in nested collections (`families/{familyId}/tasks/`, etc.) and on global user doc (`users/{uid}` has `familyId` field). All queries filter by `familyId` before returning.

---

*Architecture analysis: 2026-03-31*

# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
familyquest/
├── src/                          # Frontend React + Vite app
│   ├── main.tsx                  # App entry point
│   ├── App.tsx                   # Root component with auth + real-time listeners
│   ├── index.css                 # Global styles + Tailwind
│   ├── firebase.ts               # Firebase app init + Firestore offline cache
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces (Family, Member, Task, etc.)
│   ├── store/                    # Zustand global state
│   │   ├── authStore.ts          # Firebase user, current member, family, loading state
│   │   └── familyStore.ts        # All family members list
│   ├── router/                   # React Router configuration
│   │   ├── index.tsx             # Router setup, lazy pages, route guards
│   │   ├── ProtectedRoute.tsx    # Auth guard (requires login)
│   │   └── RoleRoute.tsx         # Role guard (admin-only, etc.)
│   ├── services/                 # Firestore CRUD + Firebase SDK calls
│   │   ├── auth.service.ts       # Sign in, register, sign out
│   │   ├── family.service.ts     # Family CRUD, invite code
│   │   ├── task.service.ts       # Task CRUD, soft delete, real-time listeners
│   │   ├── completion.service.ts # Create/update completions, submissions, approvals
│   │   ├── prize.service.ts      # Prize CRUD, real-time listeners
│   │   ├── redemption.service.ts # Redeem prize (atomic transaction)
│   │   ├── cycle.service.ts      # Read cycles, calculate rankings
│   │   ├── storage.service.ts    # Upload photo proof to Firebase Storage
│   │   └── fcm.service.ts        # FCM token registration, notification handling
│   ├── hooks/                    # Custom React hooks for data fetching
│   │   ├── useTasks.ts           # Subscribe to active tasks, filter by due date
│   │   ├── useCompletions.ts     # Subscribe to completions, map by task
│   │   ├── usePrizes.ts          # Subscribe to prizes
│   │   ├── useCycle.ts           # Read current/historical cycles
│   │   └── useThemeColors.ts     # Theme color helpers (male/female variants)
│   ├── utils/                    # Pure functions
│   │   ├── recurrence.ts         # Task due date logic (daily, weekly, monthly, etc.)
│   │   ├── date.ts               # Date formatting, comparisons
│   │   ├── points.ts             # Points calculations
│   │   ├── theme.ts              # Theme color palettes
│   │   └── imageCompress.ts      # Image compression before upload
│   ├── components/               # React components
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx     # Main layout (TopBar + content + BottomNav)
│   │   │   ├── TopBar.tsx        # Header with title and back button
│   │   │   └── BottomNav.tsx     # Mobile-first navigation (home, points, prizes, admin, profile)
│   │   ├── ui/                   # Reusable UI primitives
│   │   │   ├── Button.tsx        # Standard button component
│   │   │   ├── Card.tsx          # Card container
│   │   │   ├── Avatar.tsx        # User avatar (emoji or image)
│   │   │   └── PointsBadge.tsx   # Points display badge
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx      # Task card with status + completion button
│   │   │   ├── TaskList.tsx      # List of tasks (mandatory/optional)
│   │   │   ├── TaskForm.tsx      # Form for creating/editing tasks (admin)
│   │   │   └── CompletionButton.tsx # Button to mark task complete + upload photo
│   │   ├── prizes/
│   │   │   ├── PrizeCard.tsx     # Prize card with redeem button
│   │   │   ├── PrizeGrid.tsx     # Grid of prizes
│   │   │   └── RedeemModal.tsx   # Modal to confirm redemption
│   │   └── notifications/
│   │       └── PushPermissionBanner.tsx # Request push notification permission
│   └── pages/                    # Full page components
│       ├── auth/
│       │   ├── LoginPage.tsx     # Email/password login
│       │   ├── RegisterPage.tsx  # Create family + admin account
│       │   └── JoinFamilyPage.tsx # Enter family via invite code
│       ├── member/               # Member (child) pages
│       │   ├── HomePage.tsx      # Today's tasks, level/XP progress
│       │   ├── PointsPage.tsx    # Points balance, history, monthly chart
│       │   ├── PrizesPage.tsx    # Prize catalog, redemption history
│       │   ├── PerformancePage.tsx # Personal performance + family ranking
│       │   └── ProfilePage.tsx   # User profile, avatar, display name
│       └── admin/                # Admin (parent) pages
│           ├── DashboardPage.tsx # Family dashboard, completion stats
│           ├── TasksPage.tsx     # Task CRUD list view
│           ├── TaskFormPage.tsx  # Create/edit task with recurrence preview
│           ├── TaskStatsPage.tsx # Stats for a single task (completion rate, etc.)
│           ├── ApprovalsPage.tsx # Queue of pending approvals (when requireTaskApproval enabled)
│           ├── PrizesAdminPage.tsx # Prize CRUD, redemption history
│           ├── MembersPage.tsx   # Member management (invite, remove, role change)
│           ├── PointsAdjustPage.tsx # Manual points adjustment per member
│           └── SettingsPage.tsx  # Family settings (points mode, approval required, timezone)
├── functions/                    # Firebase Cloud Functions (Node.js)
│   ├── src/
│   │   ├── index.ts              # Function exports (schedulers + triggers)
│   │   ├── generateDailyCompletions.ts # 00:01 BRT daily — create pending completions
│   │   ├── processMissedTasks.ts # 00:05 BRT daily — mark missed, apply penalties
│   │   ├── onCompletionApproved.ts # Firestore trigger — credit points, recalculate streak
│   │   ├── closeMonthCycle.ts    # 00:10 BRT on 1st — aggregate stats, reset points (optional)
│   │   ├── sendTaskReminders.ts  # Every 15 min — FCM for due tasks
│   │   └── recurrence.ts         # Shared task due-date logic (sync with frontend)
│   └── package.json              # Firebase Functions dependencies
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── firebase-messaging-sw.js  # Service worker for FCM
│   └── icons/                    # App icons for PWA
├── dist/                         # Build output (Vite)
├── .env.local                    # Firebase config (keys, project ID, VAPID key)
├── .env.example                  # Template for .env.local
├── vite.config.ts                # Vite + PWA plugin config
├── tsconfig.json                 # TypeScript config root
├── tsconfig.app.json             # TypeScript config for src/
├── tailwind.config.js            # Tailwind CSS config (colors, breakpoints)
├── package.json                  # Frontend dependencies
├── firebase.json                 # Firebase deployment config
├── firestore.rules               # Firestore Security Rules
├── firestore.indexes.json        # Firestore composite indexes
├── storage.rules                 # Firebase Storage Security Rules
├── eslint.config.js              # ESLint configuration
└── index.html                    # HTML entry point (loads src/main.tsx)
```

## Directory Purposes

**`src/`:**
- Purpose: All frontend React code
- Contains: Pages, components, hooks, services, stores, utilities, types
- Key files: `main.tsx` (entry), `App.tsx` (root component), `firebase.ts` (Firebase init)

**`src/types/`:**
- Purpose: Centralized TypeScript interfaces
- Contains: Family, Member, Task, Completion, Prize, Redemption, Cycle, AppUser types
- Key files: `index.ts` (all types, ~173 lines)

**`src/store/`:**
- Purpose: Global state management with Zustand
- Contains: Auth state (Firebase user, member, family), family members list
- Key files: `authStore.ts` (auth + member + family state), `familyStore.ts` (members array)

**`src/router/`:**
- Purpose: React Router configuration and guards
- Contains: Router definition, route protection
- Key files: `index.tsx` (routes), `ProtectedRoute.tsx` (auth guard), `RoleRoute.tsx` (role guard)

**`src/services/`:**
- Purpose: Direct Firestore/Firebase SDK access
- Contains: CRUD operations, real-time listeners, transactions, batch operations
- Key files: One per entity (task, completion, prize, etc.) + auth, storage, FCM

**`src/hooks/`:**
- Purpose: Custom React hooks combining services and business logic
- Contains: Real-time data subscriptions filtered and mapped for components
- Key files: `useTasks.ts`, `useCompletions.ts`, `usePrizes.ts`, `useCycle.ts`

**`src/utils/`:**
- Purpose: Reusable pure functions (no side effects)
- Contains: Date math, task recurrence, points calculations, theme helpers
- Key files: `recurrence.ts` (task due date logic), `date.ts`, `points.ts`

**`src/components/`:**
- Purpose: Reusable React components
- Contains: Layout shells, UI primitives, task/prize/notification components
- Subdirs: `layout/` (AppLayout, TopBar, BottomNav), `ui/` (Button, Card, Avatar), `tasks/`, `prizes/`, `notifications/`

**`src/pages/`:**
- Purpose: Full-page components (one per route)
- Contains: All routes: auth (Login, Register, Join), member (Home, Points, Prizes, Performance, Profile), admin (Dashboard, Tasks, Approvals, Prizes, Members, Settings, TaskStats)
- Subdirs: `auth/`, `member/`, `admin/`

**`functions/src/`:**
- Purpose: Firebase Cloud Functions (backend automation)
- Contains: Scheduled tasks (daily generation, missed penalties, month closure, reminders) + Firestore trigger (completion approval)
- Key files: `index.ts` (function exports), `generateDailyCompletions.ts`, `processMissedTasks.ts`, `onCompletionApproved.ts`, `closeMonthCycle.ts`, `sendTaskReminders.ts`

**`public/`:**
- Purpose: Static assets and service worker
- Contains: PWA manifest, Firebase messaging service worker, app icons
- Key files: `manifest.json` (PWA meta), `firebase-messaging-sw.js` (FCM handler)

**`dist/`:**
- Purpose: Build output (generated by Vite)
- Contains: Compiled JavaScript, CSS, HTML
- Committed: No (in .gitignore)

## Key File Locations

**Entry Points:**
- `index.html`: Loads `<div id="root">` and script tag for `src/main.tsx`
- `src/main.tsx`: React entry; renders `<App />` to root
- `src/App.tsx`: Root component; initializes Firebase auth, real-time listeners, Zustand stores
- `src/router/index.tsx`: Router configuration; imported and wrapped by `App.tsx`

**Configuration:**
- `.env.local`: Firebase credentials, VAPID key for FCM (never committed)
- `.env.example`: Template showing required env vars
- `tsconfig.json`: Root TypeScript config
- `tsconfig.app.json`: App-specific TypeScript config
- `vite.config.ts`: Vite build config + PWA plugin
- `tailwind.config.js`: Tailwind CSS colors, breakpoints, animations
- `firebase.json`: Firebase deployment settings (hosting, functions, firestore)
- `firestore.rules`: Firestore Security Rules (multi-tenant, role-based access)
- `storage.rules`: Firebase Storage rules (photo proof upload restrictions)
- `firestore.indexes.json`: Composite indexes for complex Firestore queries

**Core Logic:**
- `src/firebase.ts`: Firebase app initialization with Firestore offline persistence
- `src/types/index.ts`: All Firestore document interfaces (Family, Task, Completion, etc.)
- `src/utils/recurrence.ts`: Task scheduling logic (daily, weekly, monthly, monthly_relative, once)
- `src/utils/date.ts`: Date helpers (formatting, comparisons, calculations)
- `src/services/task.service.ts`: Task CRUD, soft delete, real-time listeners
- `src/services/completion.service.ts`: Completion create/update, approval workflow
- `src/services/redemption.service.ts`: Prize redemption with atomic transaction
- `src/hooks/useTasks.ts`: Hook for subscribing to tasks and filtering by due date
- `src/hooks/useCompletions.ts`: Hook for subscribing to completions and mapping by task

**Testing:**
- Currently no test files detected (test setup planned for later phase)

## Naming Conventions

**Files:**
- Services: `{entity}.service.ts` (e.g., `task.service.ts`, `completion.service.ts`)
- Hooks: `use{Entity}.ts` (e.g., `useTasks.ts`, `useCompletions.ts`)
- Pages: `{PageName}Page.tsx` (e.g., `HomePage.tsx`, `DashboardPage.tsx`)
- Components: `{ComponentName}.tsx` (e.g., `TaskCard.tsx`, `RedeemModal.tsx`)
- Utilities: `{purpose}.ts` (e.g., `recurrence.ts`, `date.ts`, `theme.ts`)
- Types: `index.ts` (all types in one file, ~173 lines)

**Directories:**
- Feature-based: `pages/member/`, `pages/admin/` (by role)
- Component type: `components/ui/`, `components/layout/`, `components/tasks/`
- Service layer: `services/` (flat, named by entity)
- State: `store/` (flat, named by domain)

**TypeScript Types:**
- Interfaces: PascalCase (e.g., `Family`, `Task`, `Member`)
- Types: PascalCase union (e.g., `TaskType`, `CompletionStatus`, `MemberRole`)
- Enums: Not used; unions preferred

**Variables and Functions:**
- camelCase: `useTodayTasks()`, `isTaskDueToday()`, `submitCompletion()`
- Constants: UPPER_SNAKE_CASE: `LEVEL_NAMES`, `XP_PER_LEVEL` (in `HomePage.tsx`)

**CSS Classes:**
- Tailwind utility-first (e.g., `bg-primary-500`, `text-on-surface`, `rounded-DEFAULT`)
- Custom theme colors defined in `tailwind.config.js` (e.g., `primary`, `tertiary`, `on-surface`)

## Where to Add New Code

**New Feature (e.g., streak badges, leaderboard):**
- Page: `src/pages/member/{FeatureName}Page.tsx` (if it's a full page) or `src/pages/admin/{FeatureName}Page.tsx`
- Components: `src/components/{feature}/` subdirectory
- Services: New methods in existing `src/services/{entity}.service.ts` or new file if new entity
- Hook: `src/hooks/use{Feature}.ts` (if fetching data)
- Route: Add to `src/router/index.tsx` lazy routes and route config
- Types: Add interfaces to `src/types/index.ts`

**New Component/Module:**
- Reusable component: `src/components/{category}/{ComponentName}.tsx`
- UI primitive: `src/components/ui/{ComponentName}.tsx`
- Layout shell: `src/components/layout/{LayoutName}.tsx`
- Example: New modal → `src/components/ui/Modal.tsx` or `src/components/{feature}/Modal.tsx`

**Utilities:**
- Pure functions: `src/utils/{purpose}.ts`
- Example: New date formatter → add function to `src/utils/date.ts` or create `src/utils/formatting.ts`
- Shared with Cloud Functions: Place in `src/utils/` and copy to `functions/src/` (e.g., `recurrence.ts`)

**Services / Data Layer:**
- New entity CRUD: Create `src/services/{entity}.service.ts`
- Add to existing service: Methods in `src/services/{entity}.service.ts`
- Example: New notifications entity → `src/services/notification.service.ts`

**Cloud Functions:**
- New scheduled task: `functions/src/{taskName}.ts` + export in `functions/src/index.ts`
- New trigger: Add new function export in `functions/src/index.ts` with Firestore trigger decorator
- Example: Weekly digest → `functions/src/sendWeeklyDigest.ts`

**Types:**
- All new types in `src/types/index.ts` (single source of truth)
- Keep organized: group by entity (Family, Member, Task, etc.)

## Special Directories

**`dist/`:**
- Purpose: Build output from Vite
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**`.firebase/`:**
- Purpose: Firebase local cache and metadata
- Generated: Yes (by Firebase CLI and runtime)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

**`functions/node_modules/`:**
- Purpose: Cloud Functions dependencies
- Generated: Yes (by `npm install` in `functions/` directory)
- Committed: No (in .gitignore)

**`.env.local`:**
- Purpose: Runtime environment variables (Firebase config, VAPID key)
- Contains: Secrets (API keys, project ID)
- Committed: No (in .gitignore)
- Must set before: Running app or deploying

---

*Structure analysis: 2026-03-31*

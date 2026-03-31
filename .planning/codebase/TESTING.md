# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Runner:**
- No test runner currently configured in `package.json`
- No Jest, Vitest, or other test framework detected in dependencies
- Testing infrastructure: Not implemented

**Assertion Library:**
- Not applicable (no testing framework in place)

**Run Commands:**
- No test scripts defined in `package.json`
- To add testing: Would need to install and configure Jest, Vitest, or similar
- Current dev scripts: `"dev": "vite"`, `"build": "tsc -b && vite build"`, `"lint": "eslint ."`

## Test File Organization

**Location:**
- Not yet established — no test files exist in `src/`
- Recommendation when tests are added: co-located with source files (e.g., `TaskCard.test.tsx` alongside `TaskCard.tsx`)

**Naming:**
- Convention would follow: `.test.ts` or `.spec.ts` suffix (not yet in use)
- Example pattern (when implemented): `src/utils/__tests__/recurrence.test.ts` or `src/utils/recurrence.test.ts`

**Structure:**
- Not applicable until testing framework is added

## Test Coverage Status

**Current State:** No tests implemented

**Testable Utilities** (when testing is added):
- `src/utils/recurrence.ts`: Pure functions ideal for unit testing
  - `isTaskDueToday()` — test all frequency types (daily, weekly, monthly, monthly_relative, once)
  - `isSameDay()` — date comparison tests
  - `getNextOccurrences()` — preview generation tests

- `src/utils/date.ts`: Pure utility functions
  - `getCurrentCycleId()` — returns correct "YYYY-MM" format
  - `getCompletionId()` — deterministic ID generation (normal and shared)
  - `formatDate()`, `formatTime()`, `formatDateFull()` — localization tests (pt-BR)

- `src/utils/points.ts`: Point calculation logic
  - Streak calculation
  - Point accumulation vs. reset logic

**Testing Gaps:**
- No integration tests for Firestore operations
- No component snapshot or behavior tests
- No Cloud Functions tests (would require Firebase Emulator Suite)
- No end-to-end tests (would require Cypress, Playwright, etc.)

## Service Layer Testing (When Implemented)

**Services without external dependencies:**

Example testable pattern in `src/services/task.service.ts`:
- Interface and async functions use dependency injection of `db` instance
- Can be tested by mocking Firestore

## Cloud Functions Testing (When Implemented)

**Current State:** No tests for Cloud Functions in `functions/`

**What needs testing:**

**`generateDailyCompletions.ts`:**
```typescript
export async function generateDailyCompletions(): Promise<void> {
  // Idempotent — should not create duplicates on re-execution
  // Should generate completions only for tasks due today
  // Should respect assignment rules (assignedTo: 'all' vs. specific UIDs)
  // Should handle batch limit (499 writes max per batch)
}
```

**`processMissedTasks.ts`:**
- Mark correct completions as 'missed' (pending/submitted from previous day)
- Apply point penalties to mandatory tasks
- Send FCM notifications

**`onCompletionApproved.ts`:**
- Trigger when completion status changes to 'approved' or 'completed'
- Credit points atomically
- Recalculate streak based on all mandatory tasks completed

**`closeMonthCycle.ts`:**
- Aggregate stats into `cycles` collection
- Reset `totalPoints` for families with `monthly_reset` mode
- Preserve `lifetimePoints` (never reset)
- Send monthly summary FCM

**Testing would require:**
- Firebase Emulator Suite (local testing)
- `firebase-functions-test` library for mocking Firestore/Admin SDK
- Test fixtures for families, tasks, members
- Transaction simulation for redemption tests

## Recommended Testing Structure (When Adding Tests)

```
familyquest/
├── src/
│   ├── utils/
│   │   ├── recurrence.ts
│   │   ├── recurrence.test.ts          # Unit tests for recurrence logic
│   │   ├── date.ts
│   │   └── date.test.ts
│   ├── services/
│   │   ├── task.service.ts
│   │   └── __tests__/
│   │       └── task.service.test.ts    # Mocked Firestore tests
│   └── components/
│       ├── tasks/
│       │   ├── TaskCard.tsx
│       │   └── TaskCard.test.tsx       # Component behavior tests
│
├── functions/
│   ├── src/
│   │   ├── generateDailyCompletions.ts
│   │   └── __tests__/
│   │       └── generateDailyCompletions.test.ts
│
└── jest.config.js (or vitest.config.ts)
```

## Key Testing Patterns (To Implement)

### Unit Testing Utilities

**recurrence.ts — Testing all frequency types:**
```typescript
describe('isTaskDueToday', () => {
  // Test daily — always true
  // Test weekly — check activeDays[] includes today's dow (0-6)
  // Test monthly — check dayOfMonth matches date
  // Test monthly_relative — verify 2nd Thursday = correct date calculation
  // Test once — check startDate matches today
});

describe('getNextOccurrences', () => {
  // Task occurring 3 times in next 30 days
  // Verify correct dates returned in chronological order
});
```

### Service Testing (Mocked Firestore)

**Example mock pattern needed:**
```typescript
jest.mock('firebase/firestore');

describe('task.service', () => {
  beforeEach(() => {
    // Reset mocks
  });

  it('createTask should add document with correct fields', async () => {
    // Mock getDocs, addDoc
    // Call createTask
    // Verify addDoc called with correct data
  });

  it('subscribeActiveTasks should call onSnapshot', () => {
    // Mock onSnapshot
    // Call subscribeActiveTasks
    // Verify unsubscribe function returned
  });
});
```

### Component Testing

**TaskCard.tsx — Example test patterns:**
```typescript
describe('<TaskCard />', () => {
  it('renders task title and points', () => {
    // Render with mock task
    // Assert title visible
  });

  it('shows completion circle when status is pending', () => {
    // Render with pending completion
    // Assert circle button rendered
  });

  it('handles completion click', async () => {
    // Render, mock service
    // Click circle
    // Verify markTaskCompleted called
  });

  it('shows rejection reason when status is rejected', () => {
    // Render with rejected completion + reason
    // Assert reason text visible
  });
});
```

### Cloud Functions Testing

**Firebase Emulator Suite approach:**
```typescript
// jest setup to use emulator
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Cloud Functions', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'familyquest-test',
    });
  });

  describe('generateDailyCompletions', () => {
    it('creates completions for tasks due today', async () => {
      // Set up test data in emulator
      // Call function
      // Verify completions created in emulator
    });

    it('is idempotent on re-execution', async () => {
      // Generate once
      // Generate again
      // Verify same number of completions (no duplicates)
    });
  });
});
```

## Security Rules Testing

**When tests are added, Firestore Rules should also be tested:**

Rules located in `firestore.rules`

Example patterns needed:
```typescript
describe('Firestore Security Rules', () => {
  it('member can read their family tasks', async () => {
    // Mock auth as member
    // Attempt read on /families/{familyId}/tasks
    // Verify succeeds
  });

  it('member cannot write to tasks (admin only)', async () => {
    // Mock auth as member
    // Attempt write on /families/{familyId}/tasks
    // Verify denied
  });

  it('member can create own completion', async () => {
    // Mock auth as member
    // Attempt create completion with userId = auth.uid
    // Verify succeeds
  });

  it('member cannot create completion for another user', async () => {
    // Mock auth as memberA
    // Attempt create completion with userId = memberB
    // Verify denied
  });
});
```

## Performance and Stress Testing

**Not yet implemented, but important areas:**

- Batch limits in Cloud Functions (499 writes per batch) — verify handled correctly
- Real-time listener scalability (many members, many tasks)
- Firestore query performance (indexes defined in `firestore.indexes.json`)
- Service Worker performance (PWA offline behavior)

## Current Testing Debt

| Item | Priority | Notes |
|------|----------|-------|
| Unit tests for `recurrence.ts` | High | Core business logic — no dependencies |
| Service layer tests (mocked Firestore) | High | Completion state machine logic critical |
| Cloud Functions tests | Medium | Idempotency and streak calculation need coverage |
| Component snapshot tests | Low | Less critical; E2E would catch regressions |
| Firestore Rules tests | High | Security-critical |
| E2E tests (Cypress/Playwright) | Medium | Full user flows (sign up, task completion, reward) |

---

*Testing analysis: 2026-03-31*

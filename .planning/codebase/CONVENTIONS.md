# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `TaskCard.tsx`, `HomePage.tsx`)
- Service files: camelCase with `.service.ts` suffix (e.g., `task.service.ts`, `completion.service.ts`)
- Hook files: camelCase with `use` prefix (e.g., `useTasks.ts`, `useCompletions.ts`)
- Utility files: camelCase (e.g., `recurrence.ts`, `date.ts`)
- Store files: camelCase with `Store.ts` suffix (e.g., `authStore.ts`)
- Type files: `index.ts` in `types/` directory
- Cloud Functions: descriptive camelCase (e.g., `generateDailyCompletions.ts`, `processMissedTasks.ts`)

**Functions:**
- camelCase throughout (e.g., `isTaskDueToday`, `subscribeActiveTasks`, `checkAndUpdateStreak`)
- Prefix conventions:
  - `handle*` for event handlers (e.g., `handleCircleClick`, `handleFileChange`)
  - `use*` for hooks (e.g., `useTasks`, `useCurrentMember`)
  - `subscribe*` for real-time listeners (e.g., `subscribeActiveTasks`)
  - `get*` for simple getters (e.g., `getCurrentCycleId`, `getCompletionId`)
  - `is*` for boolean checks (e.g., `isTaskDueToday`, `isSameDay`)
  - `on*` for Firestore triggers (e.g., `onCompletionApproved`)

**Variables:**
- camelCase for all variables and constants
- SCREAMING_SNAKE_CASE for only truly immutable constants defined at module level (rare, e.g., `XP_PER_LEVEL`, `LEVEL_NAMES`)
- React component props interface names use "Props" suffix (e.g., `TaskCardProps`, `ButtonProps`)
- Type names in `types/index.ts`: PascalCase (e.g., `Task`, `Completion`, `Member`)

**Types:**
- Interface names: PascalCase with no prefix (e.g., `Task`, `Completion`, `Family`)
- Type aliases for unions: PascalCase (e.g., `TaskType`, `CompletionStatus`, `MemberRole`)
- Zod schemas: camelCase (e.g., `taskFormSchema`)
- Generic parameters: single letters or descriptive PascalCase (e.g., `T`, `CreateTaskParams`)

## Code Style

**Formatting:**
- ESLint with TypeScript support enforced via `eslint.config.js`
- Prettier-like formatting expected (no explicit .prettierrc, but consistent style observed)
- 2-space indentation
- Semicolons required
- Single quotes in JavaScript/TypeScript (double quotes in JSX strings)
- Line length: no hard limit observed, but typically wrapped around 100 characters for readability

**Linting:**
- ESLint enabled via `eslint.config.js` (flat config format, ESLint 9+)
- Plugins: `@typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Strict TypeScript enabled: `"strict": true` in `tsconfig.app.json`
- Unused variable/parameter checks disabled: `noUnusedLocals` and `noUnusedParameters` both `false` (to avoid noise during development)

**Tailwind CSS:**
- All styling via Tailwind utility classes
- No separate CSS files in components (except global `index.css`)
- Material Design 3 color system used with custom tailwind extensions in `tailwind.config.js`
- Custom semantic colors defined: `primary`, `secondary`, `tertiary`, `error`, `surface-*`, `on-*`
- Responsive: mobile-first approach, uses Tailwind breakpoints

## Import Organization

**Order:**
1. React and core libraries (e.g., `import React`, `import { useState }`)
2. Third-party packages (Firebase, UI libraries, routing)
3. Relative imports from `src/` (services, types, hooks, components, utilities)
4. No barrel imports used (direct imports from individual files)

**Path Aliases:**
- No path aliases observed in `tsconfig.app.json` (no `baseUrl` or `paths` configured)
- All imports use relative paths (e.g., `import { Task } from '../types'`)
- Consistent nesting depth based on directory structure

**Example from `TaskCard.tsx`:**
```typescript
import React, { useRef, useState } from 'react';
import { Completion, Task } from '../../types';
import {
  markTaskCompleted,
  submitTaskForApproval,
  undoCompletion,
  cancelSubmission,
} from '../../services/completion.service';
import { uploadTaskProof } from '../../services/storage.service';
```

## Error Handling

**Patterns:**
- Try-catch blocks in async operations
- Error typing: `catch (err: unknown)` followed by type guard: `err instanceof Error ? err.message : 'fallback'`
- State-based error display: local `error` state in components, set in catch blocks
- User-facing error messages in Portuguese (UI)
- Console error logging not enforced, but error states managed at component level

**Example from `TaskCard.tsx`:**
```typescript
const completeTask = async (photoFile?: File) => {
  setLoading(true);
  setError(null);
  try {
    let photoUrl: string | undefined;
    if (photoFile) {
      photoUrl = await uploadTaskProof(familyId, task.id, userId, photoFile);
    }
    if (requireApproval) {
      await submitTaskForApproval(familyId, userId, task, photoUrl);
    } else {
      await markTaskCompleted(familyId, userId, task, photoUrl);
    }
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Erro ao registrar tarefa');
  } finally {
    setLoading(false);
  }
};
```

## Logging

**Framework:** No dedicated logging library; Console methods not observed in production code

**Patterns:**
- Server-side (Cloud Functions): Firebase Functions built-in logging via `console.log` (deployed logs viewable via Firebase Console)
- Client-side: Error states manage visibility instead of console output
- No structured logging in Cloud Functions observed

## Comments

**When to Comment:**
- Algorithm explanation (e.g., `monthly_relative` recurrence calculation in `recurrence.ts`)
- Non-obvious business logic (e.g., streak calculation logic)
- Firestore transaction complexity
- Multi-line sections marked with visual separators

**JSDoc/TSDoc:**
- Used in utility functions and services
- Single-line descriptions with `/**  ... */` format
- Example from `recurrence.ts`:
```typescript
/**
 * Verifica se uma tarefa está com prazo hoje, baseado na frequência configurada.
 * Suporta: daily, weekly, monthly, monthly_relative, once.
 */
export function isTaskDueToday(task: Task, date: Date = new Date()): boolean {
```

**Visual Separators:**
- Lines of dashes `// ─── Section Name ───────────` used to organize code sections within large files
- Example: `// ─── Status circle ───────────────────────────────────────────────────────────`

## Function Design

**Size:** Generally 10-80 lines for utility functions; components may be longer (300+ lines acceptable for complex cards like `TaskCard.tsx`)

**Parameters:**
- Named parameters wrapped in objects for functions with 2+ params (see `CreateTaskParams` in `task.service.ts`)
- Example:
```typescript
export interface CreateTaskParams {
  familyId: string;
  createdBy: string;
  data: Record<string, unknown>;
}

export const createTask = async ({ familyId, createdBy, data }: CreateTaskParams): Promise<string>
```

**Return Values:**
- Explicit return types required (TypeScript strict mode enforces this)
- `Promise<T>` for async functions
- Union types for discriminated returns (e.g., success + error handling via try-catch instead of Result types)
- Unsubscribe functions returned from real-time listeners: `Unsubscribe` type from Firebase

## Module Design

**Exports:**
- Named exports preferred (e.g., `export const useTasks = ...`)
- Default exports for page components and component exports (e.g., `export default TaskCard`)
- Barrel files not used — individual file imports required

**Service Modules:**
- Each service file (e.g., `task.service.ts`) exports multiple related functions
- No classes; functional approach throughout
- Grouping by operation type within file (Create, Read, Update, Delete, Subscribe)
- Helper functions defined at module level, not exported (private to file)

**Example from `task.service.ts` structure:**
```typescript
// ─── Create Task ──────────────────────────────────────────────────────────────
export const createTask = async (...): Promise<string> => { ... }

// ─── Update Task ──────────────────────────────────────────────────────────────
export const updateTask = async (...): Promise<void> => { ... }

// ─── Subscribe Inactive Tasks (real-time) ────────────────────────────────────
export const subscribeInactiveTasks = (...): Unsubscribe => { ... }
```

## React-Specific Patterns

**Hooks:**
- Hooks encapsulate Firestore real-time subscriptions + state management
- Custom hooks follow the `use*` naming convention
- Dependencies array carefully managed to prevent re-subscriptions
- All hooks return object with `{ data, loading, error }` or similar pattern

**Components:**
- Functional components with TypeScript `React.FC<Props>` annotation
- Props destructured in function signature
- Default props provided via parameter defaults, not defaultProps
- Event handlers inline or extracted as named functions within component (not separate)

**State Management:**
- Zustand for global auth state (`authStore`, `notificationStore`)
- Local component state via `useState` for UI-only state (loading, error, modal visibility)
- Firestore real-time listeners (onSnapshot) manage data state via hooks

**Example from `HomePage.tsx`:**
```typescript
const HomePage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const { mandatory, optional, loading } = useTodayTasks(family?.id, member?.uid);
  // ...
  return <AppLayout>{ ... }</AppLayout>;
};
```

## Form Handling

**Framework:** React Hook Form + Zod for validation

**Pattern:**
- Forms use `useForm` hook from React Hook Form
- Validation schemas with Zod
- Resolver from `@hookform/resolvers`
- Field registration via `register` or custom wrapper components

## TypeScript Usage

**Strict Mode:** Enabled (`strict: true`)

**Type Inference:**
- Explicit parameter types required
- Return types inferred when obvious, but explicit on exports
- Generics used sparingly (Firebase types like `Unsubscribe` use generics)

**Type Guards:**
- `instanceof` checks for error objects
- Optional chaining and nullish coalescing used extensively
- Discriminated unions via `type` property (e.g., `CompletionStatus` variants)

---

*Convention analysis: 2026-03-31*

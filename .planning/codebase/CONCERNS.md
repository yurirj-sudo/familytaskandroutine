# Codebase Concerns

**Analysis Date:** 2026-03-31

## Data Schema Inconsistency

**Field: `pointsLost` in Completion documents**
- Issue: Frontend code at `src/pages/member/PerformancePage.tsx` line 58 and `src/pages/member/PointsPage.tsx` attempt to read `c.pointsLost`, but this field is **never stored** in the Completion schema.
- Files affected:
  - `src/types/index.ts` (line 114: defines `pointsLost` in Completion interface)
  - `src/pages/member/PerformancePage.tsx` (line 58: reads `pointsLost`)
  - `src/pages/member/PointsPage.tsx` (reads `pointsLost` for history)
  - `functions/src/closeMonthCycle.ts` (line 80: reads `pointsLost` from completions)
- Root cause: Completions store `pointsAwarded` (positive), but penalties from missed mandatory tasks are applied directly to `member.totalPoints` in `processMissedTasks.ts`. The penalty amount is never captured in the completion record.
- Impact: Performance/dashboard pages show `Perdidos: Math.abs(c.pointsLost)` with undefined values (NaN or 0). Historical point loss tracking is missing.
- Fix approach: Either:
  1. **Store penalties in completion** — Add `pointsLost` field when marking task as 'missed' (requires modification to Cloud Functions)
  2. **Remove pointsLost references** — Derive lost points from missed mandatory task definitions at read time (inefficient but safe)
  3. **Query cycles table instead** — Cycles aggregate `pointsLost` correctly; use those for history

---

## Timezone Hardcoding

**BRT (UTC-3) hardcoded across Cloud Functions**
- Issue: All Cloud Functions hardcode BRT offset as `-3 * 60 * 60 * 1000` (UTC-3) instead of reading from family settings.
- Files affected:
  - `functions/src/generateDailyCompletions.ts` (line 114)
  - `functions/src/processMissedTasks.ts` (line 101)
  - `functions/src/sendTaskReminders.ts` (line 17)
- Problem: Family model has `settings.timezone` field (e.g., "America/Sao_Paulo"), but functions ignore it. If a family is in a different timezone, task generation and reminders will fire at wrong local times.
- Impact: Families outside Brazil get incorrect daily completion generation times and reminder schedules.
- Fix approach: Refactor helpers to accept timezone from family settings. Use `date-fns-tz` or similar library to convert UTC scheduler time to family's local timezone. Query family doc once per function run to get timezone.

---

## Client-Side Streak Calculation (Race Condition Risk)

**Streak update logic runs client-side instead of atomically on server**
- Issue: `src/services/completion.service.ts` `checkAndUpdateStreak()` runs on the client after task completion, checking all mandatory tasks for the day and updating streak.
- Files affected:
  - `src/services/completion.service.ts` (lines 24–106)
  - Called from `markTaskCompleted()` and `approveCompletion()`
- Problem:
  1. Function loads all task definitions (including recurrence logic) client-side to check "is task due today"
  2. Multiple race conditions: if two admin approvals happen simultaneously, streak could be counted twice or skipped
  3. Differs from Cloud Functions `onCompletionApproved.ts` which **should** be handling this server-side
- Impact: Inconsistent streak values, potential double-counting of days.
- Fix approach: Remove client-side `checkAndUpdateStreak()` calls. Implement atomic `onCompletionApproved` Cloud Function properly (currently logic is split between frontend and backend). Let server-side function handle all streak recalculation.

---

## Approval Flow Inconsistency

**Two different code paths for marking task completed**
- Issue: Completions can be credited in two ways:
  1. **Client-side** (when `requireTaskApproval: false`): `markTaskCompleted()` immediately runs transaction, credits points
  2. **Cloud Function** (when `requireTaskApproval: true`): `approveCompletion()` awaits Cloud Function trigger
- Files affected:
  - `src/services/completion.service.ts` (markTaskCompleted vs approveCompletion)
  - `functions/src/onCompletionApproved.ts` (server-side crediting)
- Problem: Points can be credited twice if both client transaction AND Cloud Function fire. No guard in Cloud Function to check if points already credited (only checks status transition).
- Impact: Double-crediting points in race conditions; inconsistent point totals.
- Fix approach: Implement Cloud Function `onCompletionApproved.ts` for **all** cases (both approval modes). Remove client-side point crediting from `markTaskCompleted()` and `approveCompletion()`. Let server-side function be the single source of truth.

---

## Storage Rules Too Permissive

**Unauthenticated photo uploads not family-scoped**
- Issue: `storage.rules` line 9 allows **any authenticated user** to read proof photos from **any family**.
  ```
  allow read: if request.auth != null;
  ```
- Files affected: `storage.rules`
- Problem: A user from Family A can view photo proofs uploaded by Family B members. No `familyId` validation in read rule.
- Impact: Privacy breach — children's task proof photos visible across families.
- Fix approach: Add family validation to storage read rules:
  ```
  allow read: if request.auth != null &&
    isMemberOfFamily(request.path[4]); // path[4] is familyId
  ```

---

## Batch Write Limit Not Bulletproof

**generateDailyCompletions batch limit at 499 writes**
- Issue: `functions/src/generateDailyCompletions.ts` line 93 commits batch at 499 writes. Firestore limit is 500.
- Files affected: `functions/src/generateDailyCompletions.ts`
- Problem: Off-by-one safety margin is good, but if `update` operation to `lastGeneratedDate` (line 103) fails silently, the function can be re-triggered and create duplicates despite deterministic IDs.
- Impact: If family doc update fails, next function run regenerates all completions for the day. Idempotent ID prevents duplicate records, but increases quota usage.
- Fix approach: Move `lastGeneratedDate` update **inside** a final batch commit, or wrap entire family processing in try-catch with explicit logging.

---

## Cycle Aggregation Missing Approval State

**closeMonthCycle counts tasks completed/missed but ignores 'submitted' status**
- Issue: `functions/src/closeMonthCycle.ts` line 76 checks `if (c.status === 'completed' || c.status === 'approved')`, but doesn't count 'submitted' tasks.
- Files affected: `functions/src/closeMonthCycle.ts`
- Problem: If a task is submitted but not yet approved when the month closes (1st of next month), it's lost from aggregation. Final cycle stats won't include it.
- Impact: Monthly statistics are missing submitted-but-unapproved tasks, skewing completion rates and point tracking.
- Fix approach: Include 'submitted' status in completion check: `['completed', 'approved', 'submitted']`. Or explicitly count 'submitted' separately if approval status matters for stats.

---

## Missing Null Checks in Cloud Functions

**Unguarded optional field access**
- Issue: Multiple Cloud Functions access optional fields without validation:
  - `closeMonthCycle.ts` line 78: `c.pointsLost ?? 0` — but `pointsLost` is never written
  - `onCompletionApproved.ts` line 43: `dueDate` may be missing for manually-created completions
- Files affected:
  - `functions/src/closeMonthCycle.ts`
  - `functions/src/onCompletionApproved.ts`
- Impact: Silent data loss or NaN in calculations if field is undefined.
- Fix approach: Add explicit type guards and log warnings if unexpected fields are missing. Create factory functions for completion creation to ensure all required fields are set.

---

## Task Recurrence Sync Issue

**Client and server recurrence logic must stay in sync**
- Issue: `functions/src/recurrence.ts` mirrors `src/utils/recurrence.ts` with comment "Keep in sync when modifying".
- Files affected:
  - `functions/src/recurrence.ts`
  - `src/utils/recurrence.ts`
- Problem: Two separate implementations means changes to one aren't automatically reflected in the other. Risk of task generation logic diverging between frontend and backend.
- Impact: Tasks generated by Cloud Function may not match what frontend expects; completions for "incorrect" dates.
- Fix approach: Extract recurrence logic to shared npm package (`@familyquest/recurrence`) published to private registry, imported by both frontend and functions. Or generate completions on frontend and persist them (less safe but eliminates sync risk).

---

## Photo Proof Upload Missing Validation

**No server-side validation of uploaded images**
- Issue: `src/services/storage.service.ts` uploads files with only client-side size/type checks. Storage rules (size < 10MB, type: image/*) are enforced by Firebase, but no virus scan or malicious content detection.
- Files affected: `src/services/storage.service.ts`
- Problem: Large EXIF data, polyglot files, or steganographic payloads could bypass validation.
- Impact: Low (Firebase Storage is generally safe), but no defense-in-depth.
- Fix approach: Implement server-side validation via Cloud Function `onPhotoProofUploaded` that:
  1. Re-validates file type (read actual bytes, not just extension)
  2. Strips EXIF data with `exiftool` or similar
  3. Re-encodes image to remove any polyglot content

---

## Incomplete Error Handling in Cloud Functions

**Silent failures in FCM token cleanup**
- Issue: `functions/src/sendTaskReminders.ts` line 138 catches invalid FCM token errors and deletes token, but error is suppressed:
  ```js
  .catch(() => {/* ignore */});
  ```
- Files affected: `functions/src/sendTaskReminders.ts`
- Problem: If token deletion fails, invalid tokens accumulate; function silently continues.
- Impact: Wasted API calls attempting to send to dead tokens; no observability into token cleanup failures.
- Fix approach: Log all errors, even if handled:
  ```js
  .catch((err) => {
    console.warn(`Failed to delete token for ${member.uid}:`, err.message);
  });
  ```

---

## Redemption Flow Inconsistency

**Two code paths for redeeming prizes**
- Issue: `src/services/redemption.service.ts` line 20 has `requestPrizeRedemption()` which creates a 'pending' redemption. But comment says "no points deducted yet" and line 49 creates with status 'pending', implying manual admin approval. However, CLAUDE.md section 6 specifies redeems should be "automático".
- Files affected:
  - `src/services/redemption.service.ts` (lines 18–61)
  - `src/services/redemption.service.ts` (lines 65–115, approvePrizeRedemption)
  - CLAUDE.md spec (section 6: "automático")
- Problem: Current code treats redemptions as pending/approval-required, not automatic. Conflicts with documented spec.
- Impact: User experience mismatch — children request prize but must wait for admin approval, contrary to design intent.
- Fix approach: Clarify design intent:
  - If automatic: remove `requestPrizeRedemption()` status='pending', run entire transaction in `requestPrizeRedemption()`
  - If manual approval: update CLAUDE.md to reflect two-step flow

---

## Missing Cascade Delete

**No cleanup when family is deleted**
- Issue: No Cloud Function or client-side logic to delete subcollections when a family document is deleted.
- Files affected: Firestore structure (all families/{familyId}/* collections)
- Problem: If an admin deletes a family, all related tasks, completions, prizes, redemptions, cycles are orphaned (Firestore doesn't cascade delete).
- Impact: Data pollution, quota waste, potential data leaks if backups aren't cleaned.
- Fix approach: Implement `onFamilyDeleted` Cloud Function that:
  1. Recursively deletes all subcollections
  2. Or use Firestore bulk delete API in Cloud Function

---

## Test Coverage Gaps

**No tests for Cloud Functions**
- Issue: Zero test files found for Cloud Functions. Functions deployed to production without automated testing.
- Files affected: `functions/src/**/*.ts` (all functions)
- Problem: Breaking changes in Firestore schema aren't caught; recurrence logic bugs in `generateDailyCompletions` go undetected.
- Impact: High risk of data corruption and missed tasks.
- Fix approach: Implement Jest tests with Firestore emulator:
  - Test `generateDailyCompletions` with all frequency types
  - Test `processMissedTasks` penalty logic
  - Test `closeMonthCycle` aggregation
  - Test streak recalculation in `onCompletionApproved`

---

## Loading State Race Condition

**App initialization hangs if user doc doesn't exist**
- Issue: `src/App.tsx` lines 59–66 wait indefinitely for user doc via `onSnapshot` if doc never appears.
- Files affected: `src/App.tsx`
- Problem: If user is deleted by admin after auth but before user doc loads, the listener never fires and app stays in loading state forever.
- Impact: User sees infinite spinner; must hard-refresh to escape.
- Fix approach: Add timeout:
  ```typescript
  const userSnap = await Promise.race([
    new Promise((resolve) => {
      const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
        if (snap.exists()) {
          resolve(snap);
          unsub();
        }
      });
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('User doc timeout')), 5000))
  ]);
  ```

---

## Shared Task Completion Logic Unclear

**sharedCompletion field implementation incomplete**
- Issue: Task interface includes `sharedCompletion: boolean` field (types/index.ts line 76), but:
  1. Not enforced in Cloud Functions — each user gets separate completion ID
  2. Completion ID generation at `src/services/completion.service.ts` line 171 checks `task.sharedCompletion`, but field isn't exposed in UI
- Files affected:
  - `src/types/index.ts`
  - `src/services/completion.service.ts`
  - `src/components/tasks/TaskForm.tsx` (missing toggle)
  - `functions/src/generateDailyCompletions.ts` (ignores sharedCompletion)
- Problem: Feature partially implemented; unclear expected behavior.
- Impact: If admin enables sharedCompletion, unpredictable behavior.
- Fix approach: Either complete implementation (TaskForm toggle + Cloud Function support) or remove field entirely.

---

## Performance: N+1 Queries in Streak Logic

**checkAndUpdateStreak loads all completions for user**
- Issue: `src/services/completion.service.ts` line 58 runs `getDocs(where('userId', '==', userId))` without date filter, loading all completions for the user (potentially thousands).
- Files affected: `src/services/completion.service.ts`
- Problem: Should be limited to 7 days worth to check previous day's completion state.
- Impact: Slow page loads on members with months of task history.
- Fix approach: Add `where('dueDate', '>=', Timestamp.fromDate(weekAgo))` to query.

---

## Monthly Cycle ID Format Inconsistency

**Two different cycle ID schemes**
- Issue:
  - CLAUDE.md specifies: `"2025-03"` (year-month)
  - `functions/src/closeMonthCycle.ts` line 15: ``${year}-${mm}_${userId}`` (year-month_userid)
- Files affected:
  - `functions/src/closeMonthCycle.ts`
  - `src/utils/date.ts` (may differ)
  - Database documents in `/cycles`
- Problem: Inconsistent IDs make querying cycles ambiguous.
- Impact: Ranking calculation and cycle lookups may fail or query wrong documents.
- Fix approach: Standardize on single format. Recommend `YYYY-MM_uid` to allow indexing by (familyId, cycleId) efficiently.

---

## Memory Leaks from Listeners

**onSnapshot listeners not cleaned up in all paths**
- Issue: Multiple pages set up real-time listeners but don't unsubscribe on errors.
- Files affected:
  - `src/App.tsx` (good cleanup)
  - `src/pages/admin/ApprovalsPage.tsx` (check if cleanup in useEffect)
  - `src/hooks/useCompletions.ts` (good cleanup)
- Problem: If listener errors out, unsub function may not exist; listener stays active.
- Impact: Memory leak over time, especially on slow networks with frequent disconnects.
- Fix approach: Always wrap `onSnapshot` callback in error handler:
  ```typescript
  onSnapshot(q, (snap) => { ... }, (err) => {
    console.error('Listener error:', err);
    // unsub() is already called by React cleanup
  });
  ```

---

## Security: Missing CSRF Protection

**No CSRF tokens on state-changing operations**
- Issue: Client-side mutations (approveCompletion, rejectCompletion, redeem prize) use only Firebase Auth tokens, no CSRF tokens.
- Files affected: All service/*.service.ts files
- Problem: If user visits malicious site while logged into FamilyQuest PWA, attacker can craft requests to mutate family data.
- Impact: Medium (Firebase rules prevent cross-family access, but same-family exploits possible).
- Fix approach: Not required for PWA (same-origin policy protects), but consider:
  1. Add custom claims to Firebase tokens specifying familyId
  2. Validate familyId in Security Rules
  (Already implemented in CLAUDE.md spec — confirm in rules enforcement)

---

## Batch Size Estimation Missing

**generateDailyCompletions may exceed batch limit with large families**
- Issue: Function commits batch at 499 writes per family, but if a family has:
  - 100 members × 20 daily tasks = 2000 writes needed
  - Function commits at 499, then 499, then continues — OK
  - But if writes happen in tight loop, function may timeout before committing final batch
- Files affected: `functions/src/generateDailyCompletions.ts`
- Impact: Last ~0-499 writes per family may be lost if timeout occurs.
- Fix approach: Estimate batch size before loop: `taskCount * memberCount` and commit if > 400 writes in progress.

---

## Completion ID Collision Risk

**getCompletionId() logic not fully documented**
- Issue: ID generation in `src/utils/date.ts` uses `{taskId}_{uid}_{YYYY-MM-DD}`, but `sharedCompletion` flag alters behavior (line 171 of completion.service.ts).
- Files affected:
  - `src/utils/date.ts` (getCompletionId)
  - `src/services/completion.service.ts` (callers)
- Problem: If `sharedCompletion: true`, multiple users should share one ID, but current logic generates per-user IDs anyway.
- Impact: Shared task completions don't work as designed.
- Fix approach: Clarify and implement: if `sharedCompletion`, ID should be `{taskId}_shared_{YYYY-MM-DD}` and only first completion counts.

---

*Concerns audit: 2026-03-31*

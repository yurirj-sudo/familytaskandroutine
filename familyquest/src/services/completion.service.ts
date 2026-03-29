import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Completion, CompletionStatus, Task } from '../types';
import { getCompletionId, getCurrentCycleId, getTodayString } from '../utils/date';

// ─── Get today completions (real-time) ───────────────────────────────────────

export const subscribeTodayCompletions = (
  familyId: string,
  userId: string,
  onData: (completions: Completion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const todayStr = getTodayString();
  // IDs are deterministic: {taskId}_{uid}_{YYYY-MM-DD}
  // We query by userId and dueDate range
  const startOfDay = new Date(todayStr + 'T00:00:00');
  const endOfDay = new Date(todayStr + 'T23:59:59');

  const q = query(
    collection(db, 'families', familyId, 'completions'),
    where('userId', '==', userId),
    where('dueDate', '>=', Timestamp.fromDate(startOfDay)),
    where('dueDate', '<=', Timestamp.fromDate(endOfDay))
  );

  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Completion))),
    onError
  );
};

// ─── Subscribe All Family Completions for Today (admin view) ─────────────────

export const subscribeFamilyTodayCompletions = (
  familyId: string,
  onData: (completions: Completion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const todayStr = getTodayString();
  const startOfDay = new Date(todayStr + 'T00:00:00');
  const endOfDay = new Date(todayStr + 'T23:59:59');

  const q = query(
    collection(db, 'families', familyId, 'completions'),
    where('dueDate', '>=', Timestamp.fromDate(startOfDay)),
    where('dueDate', '<=', Timestamp.fromDate(endOfDay))
  );

  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Completion))),
    onError
  );
};

// ─── Mark Task Complete (client-side, no approval required) ──────────────────

export const markTaskCompleted = async (
  familyId: string,
  userId: string,
  task: Task,
  photoProofUrl?: string
): Promise<void> => {
  const todayStr = getTodayString();
  const completionId = getCompletionId(task.id, userId, todayStr);
  const completionRef = doc(db, 'families', familyId, 'completions', completionId);

  await setDoc(
    completionRef,
    {
      taskId: task.id,
      taskTitle: task.title,
      taskType: task.type,
      userId,
      familyId,
      status: 'completed' as CompletionStatus,
      pointsAwarded: task.pointsOnComplete,
      photoProofUrl: photoProofUrl ?? null,
      completedAt: serverTimestamp(),
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      dueDate: Timestamp.fromDate(new Date(todayStr + 'T23:59:59')),
      cycleId: getCurrentCycleId(),
      note: null,
    },
    { merge: false }
  );

  // Credit points directly (only when requireTaskApproval is false)
  const memberRef = doc(db, 'families', familyId, 'members', userId);
  await runTransaction(db, async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) return;
    const pts = task.pointsOnComplete;
    tx.update(memberRef, {
      totalPoints: (memberSnap.data().totalPoints ?? 0) + pts,
      lifetimePoints: (memberSnap.data().lifetimePoints ?? 0) + pts,
    });
  });
};

// ─── Submit Task for Approval (requireTaskApproval = true) ───────────────────

export const submitTaskForApproval = async (
  familyId: string,
  userId: string,
  task: Task,
  photoProofUrl?: string
): Promise<void> => {
  const todayStr = getTodayString();
  const completionId = getCompletionId(task.id, userId, todayStr);
  const completionRef = doc(db, 'families', familyId, 'completions', completionId);

  await setDoc(
    completionRef,
    {
      taskId: task.id,
      taskTitle: task.title,
      taskType: task.type,
      userId,
      familyId,
      status: 'submitted' as CompletionStatus,
      pointsAwarded: task.pointsOnComplete, // stored for preview; credited only on approval
      photoProofUrl: photoProofUrl ?? null,
      completedAt: null,
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      dueDate: Timestamp.fromDate(new Date(todayStr + 'T23:59:59')),
      cycleId: getCurrentCycleId(),
      note: null,
    },
    { merge: false }
  );
};

// ─── Undo Completion (member self-completed, no approval) ────────────────────
// Resets status back to 'pending' and reverses credited points (transaction).

export const undoCompletion = async (
  familyId: string,
  userId: string,
  completion: Completion
): Promise<void> => {
  const completionRef = doc(db, 'families', familyId, 'completions', completion.id);
  const memberRef    = doc(db, 'families', familyId, 'members', userId);

  await runTransaction(db, async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) return;

    const pts = completion.pointsAwarded ?? 0;
    const current = memberSnap.data();

    // Reverse credited points (floor at 0 to avoid negatives from race)
    tx.update(memberRef, {
      totalPoints:    Math.max(0, (current.totalPoints    ?? 0) - pts),
      lifetimePoints: Math.max(0, (current.lifetimePoints ?? 0) - pts),
    });

    // Reset completion to pending
    tx.update(completionRef, {
      status:       'pending' as CompletionStatus,
      pointsAwarded: 0,
      completedAt:  null,
      photoProofUrl: null,
    });
  });
};

// ─── Cancel Submission (member cancels a submitted-for-approval task) ─────────
// No point reversal needed — points are credited only on approval.

export const cancelSubmission = async (
  familyId: string,
  completionId: string
): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'completions', completionId), {
    status:       'pending' as CompletionStatus,
    pointsAwarded: 0,
    submittedAt:  null,
    photoProofUrl: null,
  });
};

// ─── Approve Completion (admin, requireTaskApproval = true) ──────────────────

export const approveCompletion = async (
  familyId: string,
  adminUid: string,
  completion: Completion
): Promise<void> => {
  // pointsAwarded was stored on submit (task.pointsOnComplete); use it directly
  const completionRef = doc(db, 'families', familyId, 'completions', completion.id);
  await updateDoc(completionRef, {
    status: 'approved' as CompletionStatus,
    completedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
  });
};

// ─── Reject Completion (admin) ────────────────────────────────────────────────

export const rejectCompletion = async (
  familyId: string,
  adminUid: string,
  completionId: string,
  rejectionReason: string
): Promise<void> => {
  const completionRef = doc(db, 'families', familyId, 'completions', completionId);
  await updateDoc(completionRef, {
    status: 'rejected' as CompletionStatus,
    pointsAwarded: 0,
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
    rejectionReason,
  });
};

// ─── Subscribe Pending Approvals (admin) ─────────────────────────────────────

export const subscribePendingApprovals = (
  familyId: string,
  onData: (completions: Completion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'completions'),
    where('status', '==', 'submitted')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Completion))),
    onError
  );
};

// ─── Get completions for a member in a cycle ─────────────────────────────────

export const getMemberCycleCompletions = async (
  familyId: string,
  userId: string,
  cycleId: string
): Promise<Completion[]> => {
  const snap = await getDocs(
    query(
      collection(db, 'families', familyId, 'completions'),
      where('userId', '==', userId),
      where('cycleId', '==', cycleId)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Completion));
};

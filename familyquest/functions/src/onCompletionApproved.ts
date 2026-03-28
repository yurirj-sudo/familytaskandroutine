import * as admin from 'firebase-admin';

/**
 * Triggered when a completion document is updated.
 *
 * Handles two transitions:
 * 1. status → 'approved': credits pointsAwarded and recalculates streak
 * 2. status → 'completed': same (no-approval flow credit — idempotent guard)
 */
export async function handleCompletionUpdate(
  familyId: string,
  completionBefore: FirebaseFirestore.DocumentData,
  completionAfter: FirebaseFirestore.DocumentData
): Promise<void> {
  const before = completionBefore.status;
  const after = completionAfter.status;

  if (before === after) return;
  if (after !== 'approved' && after !== 'completed') return;

  const db = admin.firestore();
  const userId: string = completionAfter.userId;
  const pts: number = completionAfter.pointsAwarded ?? 0;

  const memberRef = db
    .collection('families')
    .doc(familyId)
    .collection('members')
    .doc(userId);

  await db.runTransaction(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) return;

    const member = memberSnap.data()!;

    // ── Credit points ────────────────────────────────────────────────────────
    const newTotal = (member.totalPoints ?? 0) + pts;
    const newLifetime = (member.lifetimePoints ?? 0) + pts;

    // ── Recalculate streak ───────────────────────────────────────────────────
    // A streak day is valid when ALL mandatory tasks for that day are completed/approved
    const dueDate: admin.firestore.Timestamp = completionAfter.dueDate;
    const dueDateStr = dueDate.toDate().toISOString().split('T')[0];

    // Count how many mandatory completions exist for this member on this day
    // and how many are still pending/missed
    // We do this outside the transaction (reads inside tx have limits)
    const dayStart = new Date(dueDateStr + 'T00:00:00');
    const dayEnd = new Date(dueDateStr + 'T23:59:59');

    const dayCompletionsSnap = await db
      .collection('families')
      .doc(familyId)
      .collection('completions')
      .where('userId', '==', userId)
      .where('taskType', '==', 'mandatory')
      .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(dayStart))
      .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(dayEnd))
      .get();

    const allMandatoryDone = dayCompletionsSnap.docs.every((d) => {
      const s = d.id === completionAfter.id ? after : d.data().status;
      return s === 'completed' || s === 'approved';
    });

    let newStreak = member.currentStreak ?? 0;
    let newLongest = member.longestStreak ?? 0;

    if (allMandatoryDone) {
      // Check if yesterday had a valid streak
      const yesterday = new Date(dayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayStart = new Date(yesterdayStr + 'T00:00:00');
      const yesterdayEnd = new Date(yesterdayStr + 'T23:59:59');

      const yesterdayMandatorySnap = await db
        .collection('families')
        .doc(familyId)
        .collection('completions')
        .where('userId', '==', userId)
        .where('taskType', '==', 'mandatory')
        .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(yesterdayStart))
        .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(yesterdayEnd))
        .get();

      const yesterdayAllDone =
        yesterdayMandatorySnap.empty ||
        yesterdayMandatorySnap.docs.every((d) => {
          const s = d.data().status;
          return s === 'completed' || s === 'approved';
        });

      if (yesterdayAllDone) {
        newStreak = (member.currentStreak ?? 0) + 1;
      } else {
        newStreak = 1; // reset streak
      }
      newLongest = Math.max(newStreak, newLongest);
    }

    tx.update(memberRef, {
      totalPoints: newTotal,
      lifetimePoints: newLifetime,
      currentStreak: newStreak,
      longestStreak: newLongest,
    });
  });
}

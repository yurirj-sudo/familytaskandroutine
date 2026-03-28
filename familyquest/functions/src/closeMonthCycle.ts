import * as admin from 'firebase-admin';

const db = () => admin.firestore();

interface CompletionData {
  userId: string;
  taskType: string;
  status: string;
  pointsAwarded: number;
  pointsLost?: number;
}

function getCycleDocId(userId: string, year: number, month: number): string {
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}_${userId}`;
}

/**
 * Fecha o ciclo do mes anterior para todas as familias.
 * - Agrega stats de completions do ciclo encerrado
 * - Se pointsMode === 'monthly_reset': zera totalPoints de cada membro
 * - Cria novo documento de ciclo ativo para o mes corrente
 *
 * Trigger: Scheduler dia 1 de cada mes, 00:10 BRT (03:10 UTC) — ver index.ts
 */
export async function closeMonthCycle(): Promise<void> {
  const firestore = db();
  const now = new Date();

  // We are on day 1 of the current month — close the PREVIOUS month
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();
  const prevMM = String(prevMonth).padStart(2, '0');
  const prevCyclePrefix = `${prevYear}-${prevMM}`;

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const familiesSnap = await firestore.collection('families').get();

  await Promise.all(
    familiesSnap.docs.map(async (familyDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const familyId = familyDoc.id;
      const familyData = familyDoc.data();
      const pointsMode: string = familyData?.settings?.pointsMode ?? 'accumulate';

      // Get all active members
      const membersSnap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('members')
        .where('isActive', '==', true)
        .get();

      await Promise.all(
        membersSnap.docs.map(async (memberDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const userId = memberDoc.id;

          // ── 1. Aggregate previous month completions ──────────────────────
          const completionsSnap = await firestore
            .collection('families')
            .doc(familyId)
            .collection('completions')
            .where('userId', '==', userId)
            .where('cycleId', '==', prevCyclePrefix)
            .get();

          let pointsEarned = 0;
          let pointsLost = 0;
          let tasksCompleted = 0;
          let tasksMissed = 0;

          completionsSnap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
            const c = d.data() as CompletionData;
            if (c.status === 'completed' || c.status === 'approved') {
              pointsEarned += c.pointsAwarded ?? 0;
              tasksCompleted++;
            } else if (c.status === 'missed') {
              pointsLost += Math.abs(c.pointsLost ?? 0);
              tasksMissed++;
            }
          });

          const totalTasks = tasksCompleted + tasksMissed;
          const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

          // Get redemptions for pointsSpent
          const redemptionsSnap = await firestore
            .collection('families')
            .doc(familyId)
            .collection('redemptions')
            .where('userId', '==', userId)
            .where('cycleId', '==', prevCyclePrefix)
            .get();

          const pointsSpent = redemptionsSnap.docs.reduce(
            (sum: number, d: FirebaseFirestore.QueryDocumentSnapshot) => sum + (d.data().pointsCost ?? 0), 0
          );

          const finalScore = pointsEarned - pointsLost - pointsSpent;
          const prevCycleDocId = getCycleDocId(userId, prevYear, prevMonth);

          // ── 2. Close the previous cycle ─────────────────────────────────
          await firestore
            .collection('families')
            .doc(familyId)
            .collection('cycles')
            .doc(prevCycleDocId)
            .set(
              {
                id: prevCycleDocId,
                familyId,
                userId,
                month: prevMonth,
                year: prevYear,
                pointsEarned,
                pointsLost,
                pointsSpent,
                finalScore,
                tasksCompleted,
                tasksMissed,
                completionRate,
                status: 'closed',
                closedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

          // ── 3. Reset points if monthly_reset ────────────────────────────
          const memberRef = firestore
            .collection('families')
            .doc(familyId)
            .collection('members')
            .doc(userId);

          if (pointsMode === 'monthly_reset') {
            await memberRef.update({ totalPoints: 0 });
          }

          // ── 4. Open new cycle for current month ─────────────────────────
          const currentCycleDocId = getCycleDocId(userId, currentYear, currentMonth);
          const currentCycleRef = firestore
            .collection('families')
            .doc(familyId)
            .collection('cycles')
            .doc(currentCycleDocId);

          const existingSnap = await currentCycleRef.get();
          if (!existingSnap.exists) {
            await currentCycleRef.set({
              id: currentCycleDocId,
              familyId,
              userId,
              month: currentMonth,
              year: currentYear,
              pointsEarned: 0,
              pointsLost: 0,
              pointsSpent: 0,
              finalScore: 0,
              tasksCompleted: 0,
              tasksMissed: 0,
              completionRate: 0,
              status: 'active',
              openedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          console.log(
            `[closeMonthCycle] family=${familyId} user=${userId} ` +
            `closed=${prevCyclePrefix} earned=${pointsEarned} lost=${pointsLost} ` +
            `spent=${pointsSpent} rate=${completionRate}% reset=${pointsMode === 'monthly_reset'}`
          );
        })
      );
    })
  );
}

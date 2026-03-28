import * as admin from 'firebase-admin';

/**
 * Marca como 'missed' todas as completions 'pending' ou 'submitted' do dia anterior.
 * Para tarefas obrigatórias, aplica pointsOnMiss ao membro.
 *
 * Trigger: Scheduler 00:05 BRT (05:05 UTC) — ver index.ts
 */
export async function processMissedTasks(): Promise<void> {
  const firestore = admin.firestore();
  const yesterday = getYesterdayBRT();
  const yesterdayStart = new Date(yesterday + 'T00:00:00');
  const yesterdayEnd = new Date(yesterday + 'T23:59:59');

  const familiesSnap = await firestore.collection('families').get();

  await Promise.all(
    familiesSnap.docs.map(async (familyDoc) => {
      const familyId = familyDoc.id;

      // Find all pending/submitted completions from yesterday
      const missedSnap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('completions')
        .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(yesterdayStart))
        .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(yesterdayEnd))
        .where('status', 'in', ['pending', 'submitted'])
        .get();

      if (missedSnap.empty) return;

      // Load task definitions for penalty lookup
      const taskIds = [...new Set(missedSnap.docs.map((d) => d.data().taskId as string))];
      const taskDocs = await Promise.all(
        taskIds.map((id) =>
          firestore.collection('families').doc(familyId).collection('tasks').doc(id).get()
        )
      );
      const taskMap = new Map(taskDocs.map((d) => [d.id, d.data()]));

      // Group missed by userId for bulk point deductions
      const penaltiesByUser: Record<string, number> = {};

      const batch = firestore.batch();
      let writes = 0;

      for (const completionDoc of missedSnap.docs) {
        const completion = completionDoc.data();
        const task = taskMap.get(completion.taskId);

        batch.update(completionDoc.ref, {
          status: 'missed',
          reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        writes++;

        // Apply penalty only for mandatory tasks
        if (task && task.type === 'mandatory' && task.pointsOnMiss < 0) {
          const uid = completion.userId as string;
          penaltiesByUser[uid] = (penaltiesByUser[uid] ?? 0) + task.pointsOnMiss;
        }

        if (writes === 499) {
          await batch.commit();
          writes = 0;
        }
      }

      if (writes > 0) await batch.commit();

      // Apply point penalties in transactions
      await Promise.all(
        Object.entries(penaltiesByUser).map(async ([uid, penalty]) => {
          const memberRef = firestore
            .collection('families')
            .doc(familyId)
            .collection('members')
            .doc(uid);

          await firestore.runTransaction(async (tx) => {
            const memberSnap = await tx.get(memberRef);
            if (!memberSnap.exists) return;
            const current = memberSnap.data()?.totalPoints ?? 0;
            // Points can't go below zero
            tx.update(memberRef, {
              totalPoints: Math.max(0, current + penalty),
            });
          });
        })
      );
    })
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getYesterdayBRT(): string {
  const now = new Date();
  // BRT = UTC-3
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  brt.setDate(brt.getDate() - 1);
  return brt.toISOString().split('T')[0];
}

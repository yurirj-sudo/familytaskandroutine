import * as admin from 'firebase-admin';

/**
 * Envia push notifications para tarefas que vencem nos proximos 15 minutos.
 *
 * Para cada familia, busca tarefas ativas com dueTime definido.
 * Se o dueTime cair dentro da janela [now, now + 15min] (em BRT),
 * envia FCM para cada membro atribuido que ainda nao completou a tarefa.
 *
 * Trigger: Scheduler a cada 15 min — ver index.ts
 */
export async function sendTaskReminders(): Promise<void> {
  const firestore = admin.firestore();
  const now = new Date();

  // Current time in BRT (UTC-3) as HH:MM
  const brtOffsetMs = -3 * 60 * 60 * 1000;
  const nowBRT = new Date(now.getTime() + brtOffsetMs);
  const nowMinutes = nowBRT.getHours() * 60 + nowBRT.getMinutes();
  const windowEnd = nowMinutes + 15;

  const todayStr = nowBRT.toISOString().split('T')[0];
  const todayStart = new Date(todayStr + 'T00:00:00');
  const todayEnd = new Date(todayStr + 'T23:59:59');

  const familiesSnap = await firestore.collection('families').get();

  await Promise.all(
    familiesSnap.docs.map(async (familyDoc) => {
      const familyId = familyDoc.id;

      // Get all active tasks with a dueTime set
      const tasksSnap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('tasks')
        .where('isActive', '==', true)
        .get();

      const relevantTasks = tasksSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((task: any) => {
          if (!task.dueTime) return false;
          const [h, m] = (task.dueTime as string).split(':').map(Number);
          const taskMinutes = h * 60 + m;
          return taskMinutes >= nowMinutes && taskMinutes < windowEnd;
        });

      if (relevantTasks.length === 0) return;

      // Get all members with FCM tokens
      const membersSnap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('members')
        .where('isActive', '==', true)
        .get();

      const members = membersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as Array<{
        uid: string;
        fcmToken?: string;
        displayName: string;
      }>;

      // Get today's completions to skip already-completed tasks
      const completionsSnap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('completions')
        .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(todayStart))
        .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
        .get();

      const completedSet = new Set<string>(); // "{taskId}_{userId}"
      completionsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'completed' || data.status === 'approved' || data.status === 'submitted') {
          completedSet.add(`${data.taskId}_${data.userId}`);
        }
      });

      // Send reminders
      const sendPromises: Promise<void>[] = [];

      for (const task of relevantTasks as any[]) {
        for (const member of members) {
          if (!member.fcmToken) continue;

          // Check if task is assigned to this member
          const assignedTo = task.assignedTo;
          const isAssigned =
            assignedTo === 'all' ||
            (Array.isArray(assignedTo) && assignedTo.includes(member.uid));
          if (!isAssigned) continue;

          // Skip if already handled
          if (completedSet.has(`${task.id}_${member.uid}`)) continue;

          sendPromises.push(
            admin
              .messaging()
              .send({
                token: member.fcmToken,
                notification: {
                  title: `Tarefa vence em breve!`,
                  body: `"${task.title}" vence as ${task.dueTime}. Nao esqueca!`,
                },
                data: {
                  type: 'task_reminder',
                  taskId: task.id,
                  familyId,
                },
                android: {
                  priority: 'high',
                  notification: { channelId: 'task_reminders' },
                },
                apns: {
                  payload: {
                    aps: { sound: 'default', badge: 1 },
                  },
                },
              })
              .then(() => {
                console.log(`[sendTaskReminders] sent to ${member.uid} for task=${task.id}`);
              })
              .catch((err: Error) => {
                // Invalid/expired token — remove it from member doc
                if (
                  err.message?.includes('registration-token-not-registered') ||
                  err.message?.includes('invalid-registration-token')
                ) {
                  firestore
                    .collection('families')
                    .doc(familyId)
                    .collection('members')
                    .doc(member.uid)
                    .update({ fcmToken: admin.firestore.FieldValue.delete() })
                    .catch(() => {/* ignore */});
                }
                console.warn(`[sendTaskReminders] failed for ${member.uid}:`, err.message);
              })
          );
        }
      }

      await Promise.allSettled(sendPromises);
    })
  );
}

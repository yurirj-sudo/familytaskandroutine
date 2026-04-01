import * as admin from 'firebase-admin';
import { isTaskDueToday } from './recurrence';

/**
 * Envia push notifications para tarefas que vencem nos proximos 15 minutos.
 *
 * Para cada familia, busca tarefas ativas com dueTime definido.
 * Se o dueTime cair dentro da janela [now, now + 15min] (no timezone da familia),
 * envia FCM para cada membro atribuido que ainda nao completou a tarefa.
 *
 * Trigger: Scheduler a cada 15 min — ver index.ts
 */
export async function sendTaskReminders(): Promise<void> {
  const firestore = admin.firestore();
  const now = new Date();

  const familiesSnap = await firestore.collection('families').get();

  await Promise.all(
    familiesSnap.docs.map(async (familyDoc) => {
      const familyId = familyDoc.id;
      const familyData = familyDoc.data();
      const timezone = familyData.settings?.timezone || 'America/Sao_Paulo';

      // Current time in the family's configured timezone
      const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const nowMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
      // Shift the look-ahead window by one interval (15 min) so every task
      // is notified at least 15 minutes before its due time.
      // e.g. run at 21:30 → windowStart=21:45, windowEnd=22:00
      const windowStart = nowMinutes + 15;
      const windowEnd = nowMinutes + 30;

      const todayStr = [
        nowInTz.getFullYear(),
        String(nowInTz.getMonth() + 1).padStart(2, '0'),
        String(nowInTz.getDate()).padStart(2, '0'),
      ].join('-');
      const todayStart = new Date(todayStr + 'T00:00:00');
      const todayEnd = new Date(todayStr + 'T23:59:59');

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
          // Only remind if the task is actually due today (respects frequency/activeDays etc.)
          if (!isTaskDueToday(task, nowInTz)) return false;
          const [h, m] = (task.dueTime as string).split(':').map(Number);
          const taskMinutes = h * 60 + m;
          // Window is (now+15, now+30] — always at least 15 min before due time.
          // e.g. run at 21:30 captures tasks due between 21:45 and 22:00.
          return taskMinutes > windowStart && taskMinutes <= windowEnd;
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
        fcmTokens?: string[];
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
          const tokens = member.fcmTokens ?? [];
          if (tokens.length === 0) continue;

          // Check if task is assigned to this member
          const assignedTo = task.assignedTo;
          const isAssigned =
            assignedTo === 'all' ||
            (Array.isArray(assignedTo) && assignedTo.includes(member.uid));
          if (!isAssigned) continue;

          // Skip if already handled
          if (completedSet.has(`${task.id}_${member.uid}`)) continue;

          for (const token of tokens) {
            sendPromises.push(
              admin
                .messaging()
                .send({
                  token,
                  notification: {
                    title: 'Tarefa vence em breve!',
                    body: `"${task.title}" vence as ${task.dueTime}. Nao esqueca!`,
                  },
                  data: {
                    type: 'task_reminder',
                    taskId: task.id,
                    familyId,
                  },
                  android: {
                    priority: 'high',
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
                  // Invalid/expired token — remove it from the member's tokens array
                  if (
                    err.message?.includes('registration-token-not-registered') ||
                    err.message?.includes('invalid-registration-token')
                  ) {
                    firestore
                      .collection('families')
                      .doc(familyId)
                      .collection('members')
                      .doc(member.uid)
                      .update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(token) })
                      .catch(() => {/* ignore */});
                  }
                  console.warn(`[sendTaskReminders] failed for ${member.uid}:`, err.message);
                })
            );
          }
        }
      }

      await Promise.allSettled(sendPromises);
    })
  );
}

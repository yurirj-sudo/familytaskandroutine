import * as admin from 'firebase-admin';
import { isTaskDueOnDate } from './recurrence';
import {
  MemberWithTokens,
  buildCompletedSet,
  sendTaskReminderToMembers,
  toLocalDate,
  toLocalMinutes,
} from './fcmHelper';

/**
 * Envia push notifications para tarefas que vencem nos próximos 15–30 minutos.
 *
 * A janela de busca é (now+15, now+30] para que cada tarefa seja notificada
 * com pelo menos 15 minutos de antecedência, independentemente do minuto em
 * que o scheduler dispara dentro de cada ciclo de 15 min.
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

      const nowLocal = toLocalDate(now, timezone);
      const nowMinutes = toLocalMinutes(now, timezone);

      // Janela deslocada: notifica tarefas que vencem entre now+15 e now+30,
      // garantindo pelo menos 15 min de antecedência.
      const windowStart = nowMinutes + 15;
      const windowEnd = nowMinutes + 30;

      const todayStr = [
        nowLocal.getFullYear(),
        String(nowLocal.getMonth() + 1).padStart(2, '0'),
        String(nowLocal.getDate()).padStart(2, '0'),
      ].join('-');
      const todayStart = new Date(todayStr + 'T00:00:00');
      const todayEnd = new Date(todayStr + 'T23:59:59');

      // Tarefas ativas com dueTime que vencem na janela e são devidas hoje
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
          if (!isTaskDueOnDate(task, nowLocal)) return false;
          const [h, m] = (task.dueTime as string).split(':').map(Number);
          const taskMinutes = h * 60 + m;
          return taskMinutes > windowStart && taskMinutes <= windowEnd;
        });

      if (relevantTasks.length === 0) return;

      const membersSnap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('members')
        .where('isActive', '==', true)
        .get();

      const members = membersSnap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      })) as MemberWithTokens[];

      const completedSet = await buildCompletedSet(firestore, familyId, todayStart, todayEnd);

      await Promise.all(
        relevantTasks.map((task: any) =>
          sendTaskReminderToMembers(
            firestore,
            familyId,
            { id: task.id, title: task.title, dueTime: task.dueTime, assignedTo: task.assignedTo },
            members,
            completedSet,
            'sendTaskReminders'
          )
        )
      );
    })
  );
}

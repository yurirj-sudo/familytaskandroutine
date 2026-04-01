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
 * Disparado quando uma tarefa é criada ou atualizada.
 *
 * Se o dueTime da tarefa cair dentro dos próximos 15 minutos (no timezone da
 * família) e a tarefa estiver ativa e for devida hoje, envia FCM imediatamente
 * sem esperar pelo próximo ciclo do scheduler.
 *
 * Isso cobre o caso em que o admin cria/edita uma tarefa com prazo iminente
 * — o scheduler de 15 min poderia perder a janela ou notificar tarde demais.
 */
export async function notifyIfDueSoon(
  familyId: string,
  taskId: string,
  taskData: FirebaseFirestore.DocumentData
): Promise<void> {
  // Só processa tarefas ativas com dueTime
  if (!taskData.isActive || !taskData.dueTime) return;

  const firestore = admin.firestore();
  const now = new Date();

  // Timezone da família
  const familyDoc = await firestore.collection('families').doc(familyId).get();
  const timezone = familyDoc.data()?.settings?.timezone || 'America/Sao_Paulo';

  const nowLocal = toLocalDate(now, timezone);
  const nowMinutes = toLocalMinutes(now, timezone);

  // Verifica se a tarefa é devida hoje
  const task = { id: taskId, ...taskData } as any;
  if (!isTaskDueOnDate(task, nowLocal)) return;

  // Janela de urgência: dueTime dentro dos próximos 15 minutos
  const [h, m] = (taskData.dueTime as string).split(':').map(Number);
  const taskMinutes = h * 60 + m;
  const minutesUntilDue = taskMinutes - nowMinutes;
  if (minutesUntilDue <= 0 || minutesUntilDue > 15) return;

  console.log(
    `[onTaskSaved] task=${taskId} due in ${minutesUntilDue} min — sending immediate reminder`
  );

  // Membros ativos com FCM tokens
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

  // Completions de hoje para não re-notificar quem já concluiu
  const todayStr = [
    nowLocal.getFullYear(),
    String(nowLocal.getMonth() + 1).padStart(2, '0'),
    String(nowLocal.getDate()).padStart(2, '0'),
  ].join('-');
  const todayStart = new Date(todayStr + 'T00:00:00');
  const todayEnd = new Date(todayStr + 'T23:59:59');

  const completedSet = await buildCompletedSet(firestore, familyId, todayStart, todayEnd);

  await sendTaskReminderToMembers(
    firestore,
    familyId,
    { id: taskId, title: taskData.title, dueTime: taskData.dueTime, assignedTo: taskData.assignedTo },
    members,
    completedSet,
    'onTaskSaved'
  );
}

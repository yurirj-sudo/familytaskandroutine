import * as admin from 'firebase-admin';

export interface MemberWithTokens {
  uid: string;
  fcmTokens?: string[];
}

/**
 * Envia FCM de lembrete para os membros atribuídos a uma tarefa.
 * Pula membros sem token e membros que já completaram/submeteram a tarefa.
 * Tokens inválidos são removidos automaticamente do Firestore.
 */
export async function sendTaskReminderToMembers(
  firestore: FirebaseFirestore.Firestore,
  familyId: string,
  task: { id: string; title: string; dueTime: string; assignedTo: string[] | 'all' },
  members: MemberWithTokens[],
  completedSet: Set<string>,
  logPrefix: string
): Promise<void> {
  const sendPromises: Promise<void>[] = [];

  for (const member of members) {
    const tokens = member.fcmTokens ?? [];
    if (tokens.length === 0) continue;

    const isAssigned =
      task.assignedTo === 'all' ||
      (Array.isArray(task.assignedTo) && task.assignedTo.includes(member.uid));
    if (!isAssigned) continue;

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
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default', badge: 1 } } },
          })
          .then(() => {
            console.log(`[${logPrefix}] sent to ${member.uid} for task=${task.id}`);
          })
          .catch((err: Error) => {
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
            console.warn(`[${logPrefix}] failed for ${member.uid}:`, err.message);
          })
      );
    }
  }

  await Promise.allSettled(sendPromises);
}

/**
 * Retorna um Set com as chaves "{taskId}_{userId}" das completions já tratadas hoje.
 */
export async function buildCompletedSet(
  firestore: FirebaseFirestore.Firestore,
  familyId: string,
  todayStart: Date,
  todayEnd: Date
): Promise<Set<string>> {
  const snap = await firestore
    .collection('families')
    .doc(familyId)
    .collection('completions')
    .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(todayStart))
    .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
    .get();

  const completedSet = new Set<string>();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (
      data.status === 'completed' ||
      data.status === 'approved' ||
      data.status === 'submitted'
    ) {
      completedSet.add(`${data.taskId}_${data.userId}`);
    }
  });
  return completedSet;
}

/**
 * Converte um Date para minutos desde meia-noite no timezone da família.
 */
export function toLocalMinutes(date: Date, timezone: string): number {
  const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return local.getHours() * 60 + local.getMinutes();
}

/**
 * Retorna a data local (YYYY-MM-DD) no timezone da família.
 */
export function toLocalDate(date: Date, timezone: string): Date {
  const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return local;
}

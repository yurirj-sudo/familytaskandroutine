import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { generateDailyCompletions } from './generateDailyCompletions';
import { processMissedTasks } from './processMissedTasks';
import { handleCompletionUpdate } from './onCompletionApproved';
import { closeMonthCycle } from './closeMonthCycle';
import { sendTaskReminders } from './sendTaskReminders';
import { notifyIfDueSoon } from './onTaskSaved';

admin.initializeApp();

// ─── generateDailyCompletions ─────────────────────────────────────────────────
// Roda às 00:01 BRT (03:01 UTC) todo dia
// Gera completions 'pending' para cada tarefa ativa × membro atribuído
export const scheduledGenerateDailyCompletions = functions
  .region('southamerica-east1')
  .pubsub.schedule('1 3 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    await generateDailyCompletions();
  });

// ─── processMissedTasks ───────────────────────────────────────────────────────
// Roda às 00:05 BRT (03:05 UTC) todo dia
// Marca como 'missed' as completions 'pending'/'submitted' do dia anterior
// e aplica penalidades em tarefas obrigatórias
export const scheduledProcessMissedTasks = functions
  .region('southamerica-east1')
  .pubsub.schedule('5 3 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    await processMissedTasks();
  });

// ─── closeMonthCycle ──────────────────────────────────────────────────────────
// Roda no dia 1 de cada mes, 00:10 BRT (03:10 UTC)
// Fecha o ciclo do mes anterior, reseta totalPoints (monthly_reset) e abre novo ciclo
export const scheduledCloseMonthCycle = functions
  .region('southamerica-east1')
  .pubsub.schedule('10 3 1 * *')
  .timeZone('UTC')
  .onRun(async () => {
    await closeMonthCycle();
  });

// ─── sendTaskReminders ────────────────────────────────────────────────────────
// Roda a cada 15 min
// Envia FCM para membros com tarefas que vencem nos proximos 15 minutos
export const scheduledSendTaskReminders = functions
  .region('southamerica-east1')
  .pubsub.schedule('*/15 * * * *')
  .timeZone('UTC')
  .onRun(async () => {
    await sendTaskReminders();
  });

// ─── onTaskSaved ─────────────────────────────────────────────────────────────
// Trigger: quando uma tarefa é criada ou atualizada
// Se o dueTime cair nos próximos 15 min, envia FCM imediatamente
export const onTaskCreated = functions
  .region('southamerica-east1')
  .firestore.document('families/{familyId}/tasks/{taskId}')
  .onCreate(async (snap: functions.firestore.DocumentSnapshot, context: functions.EventContext) => {
    const { familyId, taskId } = context.params;
    await notifyIfDueSoon(familyId, taskId, snap.data() ?? {});
  });

export const onTaskUpdated = functions
  .region('southamerica-east1')
  .firestore.document('families/{familyId}/tasks/{taskId}')
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const { familyId, taskId } = context.params;
    await notifyIfDueSoon(familyId, taskId, change.after.data() ?? {});
  });

// ─── onCompletionStatusChanged ────────────────────────────────────────────────
// Trigger: quando status de completion muda para 'approved' ou 'completed'
// Credita pontos ao membro e recalcula streak
export const onCompletionStatusChanged = functions
  .region('southamerica-east1')
  .firestore.document('families/{familyId}/completions/{completionId}')
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const { familyId } = context.params;
    await handleCompletionUpdate(familyId, change.before.data() ?? {}, change.after.data() ?? {});
  });

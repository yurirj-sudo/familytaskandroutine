import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { generateDailyCompletions } from './generateDailyCompletions';
import { processMissedTasks } from './processMissedTasks';
import { handleCompletionUpdate } from './onCompletionApproved';
import { closeMonthCycle } from './closeMonthCycle';
import { sendTaskReminders } from './sendTaskReminders';

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

// ─── onCompletionStatusChanged ────────────────────────────────────────────────
// Trigger: quando status de completion muda para 'approved' ou 'completed'
// Credita pontos ao membro e recalcula streak
export const onCompletionStatusChanged = functions
  .region('southamerica-east1')
  .firestore.document('families/{familyId}/completions/{completionId}')
  .onUpdate(async (change, context) => {
    const { familyId } = context.params;
    await handleCompletionUpdate(familyId, change.before.data(), change.after.data());
  });

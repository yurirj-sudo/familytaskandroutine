"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCompletionStatusChanged = exports.onTaskUpdated = exports.onTaskCreated = exports.scheduledSendTaskReminders = exports.scheduledCloseMonthCycle = exports.scheduledProcessMissedTasks = exports.scheduledGenerateDailyCompletions = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v1"));
const generateDailyCompletions_1 = require("./generateDailyCompletions");
const processMissedTasks_1 = require("./processMissedTasks");
const onCompletionApproved_1 = require("./onCompletionApproved");
const closeMonthCycle_1 = require("./closeMonthCycle");
const sendTaskReminders_1 = require("./sendTaskReminders");
const onTaskSaved_1 = require("./onTaskSaved");
admin.initializeApp();
// ─── generateDailyCompletions ─────────────────────────────────────────────────
// Roda às 00:01 BRT (03:01 UTC) todo dia
// Gera completions 'pending' para cada tarefa ativa × membro atribuído
exports.scheduledGenerateDailyCompletions = functions
    .region('southamerica-east1')
    .pubsub.schedule('1 3 * * *')
    .timeZone('UTC')
    .onRun(async () => {
    await (0, generateDailyCompletions_1.generateDailyCompletions)();
});
// ─── processMissedTasks ───────────────────────────────────────────────────────
// Roda às 00:05 BRT (03:05 UTC) todo dia
// Marca como 'missed' as completions 'pending'/'submitted' do dia anterior
// e aplica penalidades em tarefas obrigatórias
exports.scheduledProcessMissedTasks = functions
    .region('southamerica-east1')
    .pubsub.schedule('5 3 * * *')
    .timeZone('UTC')
    .onRun(async () => {
    await (0, processMissedTasks_1.processMissedTasks)();
});
// ─── closeMonthCycle ──────────────────────────────────────────────────────────
// Roda no dia 1 de cada mes, 00:10 BRT (03:10 UTC)
// Fecha o ciclo do mes anterior, reseta totalPoints (monthly_reset) e abre novo ciclo
exports.scheduledCloseMonthCycle = functions
    .region('southamerica-east1')
    .pubsub.schedule('10 3 1 * *')
    .timeZone('UTC')
    .onRun(async () => {
    await (0, closeMonthCycle_1.closeMonthCycle)();
});
// ─── sendTaskReminders ────────────────────────────────────────────────────────
// Roda a cada 15 min
// Envia FCM para membros com tarefas que vencem nos proximos 15 minutos
exports.scheduledSendTaskReminders = functions
    .region('southamerica-east1')
    .pubsub.schedule('*/15 * * * *')
    .timeZone('UTC')
    .onRun(async () => {
    await (0, sendTaskReminders_1.sendTaskReminders)();
});
// ─── onTaskSaved ─────────────────────────────────────────────────────────────
// Trigger: quando uma tarefa é criada ou atualizada
// Se o dueTime cair nos próximos 15 min, envia FCM imediatamente
exports.onTaskCreated = functions
    .region('southamerica-east1')
    .firestore.document('families/{familyId}/tasks/{taskId}')
    .onCreate(async (snap, context) => {
    var _a;
    const { familyId, taskId } = context.params;
    await (0, onTaskSaved_1.notifyIfDueSoon)(familyId, taskId, (_a = snap.data()) !== null && _a !== void 0 ? _a : {});
});
exports.onTaskUpdated = functions
    .region('southamerica-east1')
    .firestore.document('families/{familyId}/tasks/{taskId}')
    .onUpdate(async (change, context) => {
    var _a;
    const { familyId, taskId } = context.params;
    await (0, onTaskSaved_1.notifyIfDueSoon)(familyId, taskId, (_a = change.after.data()) !== null && _a !== void 0 ? _a : {});
});
// ─── onCompletionStatusChanged ────────────────────────────────────────────────
// Trigger: quando status de completion muda para 'approved' ou 'completed'
// Credita pontos ao membro e recalcula streak
exports.onCompletionStatusChanged = functions
    .region('southamerica-east1')
    .firestore.document('families/{familyId}/completions/{completionId}')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const { familyId } = context.params;
    await (0, onCompletionApproved_1.handleCompletionUpdate)(familyId, (_a = change.before.data()) !== null && _a !== void 0 ? _a : {}, (_b = change.after.data()) !== null && _b !== void 0 ? _b : {});
});
//# sourceMappingURL=index.js.map
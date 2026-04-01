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
exports.notifyIfDueSoon = notifyIfDueSoon;
const admin = __importStar(require("firebase-admin"));
const recurrence_1 = require("./recurrence");
const fcmHelper_1 = require("./fcmHelper");
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
async function notifyIfDueSoon(familyId, taskId, taskData) {
    var _a, _b;
    // Só processa tarefas ativas com dueTime
    if (!taskData.isActive || !taskData.dueTime)
        return;
    const firestore = admin.firestore();
    const now = new Date();
    // Timezone da família
    const familyDoc = await firestore.collection('families').doc(familyId).get();
    const timezone = ((_b = (_a = familyDoc.data()) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.timezone) || 'America/Sao_Paulo';
    const nowLocal = (0, fcmHelper_1.toLocalDate)(now, timezone);
    const nowMinutes = (0, fcmHelper_1.toLocalMinutes)(now, timezone);
    // Verifica se a tarefa é devida hoje
    const task = Object.assign({ id: taskId }, taskData);
    if (!(0, recurrence_1.isTaskDueOnDate)(task, nowLocal))
        return;
    // Janela de urgência: dueTime dentro dos próximos 15 minutos
    const [h, m] = taskData.dueTime.split(':').map(Number);
    const taskMinutes = h * 60 + m;
    const minutesUntilDue = taskMinutes - nowMinutes;
    if (minutesUntilDue <= 0 || minutesUntilDue > 15)
        return;
    console.log(`[onTaskSaved] task=${taskId} due in ${minutesUntilDue} min — sending immediate reminder`);
    // Membros ativos com FCM tokens
    const membersSnap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('members')
        .where('isActive', '==', true)
        .get();
    const members = membersSnap.docs.map((d) => (Object.assign({ uid: d.id }, d.data())));
    // Completions de hoje para não re-notificar quem já concluiu
    const todayStr = [
        nowLocal.getFullYear(),
        String(nowLocal.getMonth() + 1).padStart(2, '0'),
        String(nowLocal.getDate()).padStart(2, '0'),
    ].join('-');
    const todayStart = new Date(todayStr + 'T00:00:00');
    const todayEnd = new Date(todayStr + 'T23:59:59');
    const completedSet = await (0, fcmHelper_1.buildCompletedSet)(firestore, familyId, todayStart, todayEnd);
    await (0, fcmHelper_1.sendTaskReminderToMembers)(firestore, familyId, { id: taskId, title: taskData.title, dueTime: taskData.dueTime, assignedTo: taskData.assignedTo }, members, completedSet, 'onTaskSaved');
}
//# sourceMappingURL=onTaskSaved.js.map
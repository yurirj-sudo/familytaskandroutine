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
exports.sendTaskReminders = sendTaskReminders;
const admin = __importStar(require("firebase-admin"));
const recurrence_1 = require("./recurrence");
const fcmHelper_1 = require("./fcmHelper");
/**
 * Envia push notifications para tarefas que vencem nos próximos 15–30 minutos.
 *
 * A janela de busca é (now+15, now+30] para que cada tarefa seja notificada
 * com pelo menos 15 minutos de antecedência, independentemente do minuto em
 * que o scheduler dispara dentro de cada ciclo de 15 min.
 *
 * Trigger: Scheduler a cada 15 min — ver index.ts
 */
async function sendTaskReminders() {
    const firestore = admin.firestore();
    const now = new Date();
    const familiesSnap = await firestore.collection('families').get();
    await Promise.all(familiesSnap.docs.map(async (familyDoc) => {
        var _a;
        const familyId = familyDoc.id;
        const familyData = familyDoc.data();
        const timezone = ((_a = familyData.settings) === null || _a === void 0 ? void 0 : _a.timezone) || 'America/Sao_Paulo';
        const nowLocal = (0, fcmHelper_1.toLocalDate)(now, timezone);
        const nowMinutes = (0, fcmHelper_1.toLocalMinutes)(now, timezone);
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
            .map((d) => (Object.assign({ id: d.id }, d.data())))
            .filter((task) => {
            if (!task.dueTime)
                return false;
            if (!(0, recurrence_1.isTaskDueOnDate)(task, nowLocal))
                return false;
            const [h, m] = task.dueTime.split(':').map(Number);
            const taskMinutes = h * 60 + m;
            return taskMinutes > windowStart && taskMinutes <= windowEnd;
        });
        if (relevantTasks.length === 0)
            return;
        const membersSnap = await firestore
            .collection('families')
            .doc(familyId)
            .collection('members')
            .where('isActive', '==', true)
            .get();
        const members = membersSnap.docs.map((d) => (Object.assign({ uid: d.id }, d.data())));
        const completedSet = await (0, fcmHelper_1.buildCompletedSet)(firestore, familyId, todayStart, todayEnd);
        await Promise.all(relevantTasks.map((task) => (0, fcmHelper_1.sendTaskReminderToMembers)(firestore, familyId, { id: task.id, title: task.title, dueTime: task.dueTime, assignedTo: task.assignedTo }, members, completedSet, 'sendTaskReminders')));
    }));
}
//# sourceMappingURL=sendTaskReminders.js.map
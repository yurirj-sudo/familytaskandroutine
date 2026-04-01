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
exports.sendTaskReminderToMembers = sendTaskReminderToMembers;
exports.buildCompletedSet = buildCompletedSet;
exports.toLocalMinutes = toLocalMinutes;
exports.toLocalDate = toLocalDate;
const admin = __importStar(require("firebase-admin"));
/**
 * Envia FCM de lembrete para os membros atribuídos a uma tarefa.
 * Pula membros sem token e membros que já completaram/submeteram a tarefa.
 * Tokens inválidos são removidos automaticamente do Firestore.
 */
async function sendTaskReminderToMembers(firestore, familyId, task, members, completedSet, logPrefix) {
    var _a;
    const sendPromises = [];
    for (const member of members) {
        const tokens = (_a = member.fcmTokens) !== null && _a !== void 0 ? _a : [];
        if (tokens.length === 0)
            continue;
        const isAssigned = task.assignedTo === 'all' ||
            (Array.isArray(task.assignedTo) && task.assignedTo.includes(member.uid));
        if (!isAssigned)
            continue;
        if (completedSet.has(`${task.id}_${member.uid}`))
            continue;
        for (const token of tokens) {
            sendPromises.push(admin
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
                .catch((err) => {
                var _a, _b;
                if (((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes('registration-token-not-registered')) ||
                    ((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('invalid-registration-token'))) {
                    firestore
                        .collection('families')
                        .doc(familyId)
                        .collection('members')
                        .doc(member.uid)
                        .update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(token) })
                        .catch(() => { });
                }
                console.warn(`[${logPrefix}] failed for ${member.uid}:`, err.message);
            }));
        }
    }
    await Promise.allSettled(sendPromises);
}
/**
 * Retorna um Set com as chaves "{taskId}_{userId}" das completions já tratadas hoje.
 */
async function buildCompletedSet(firestore, familyId, todayStart, todayEnd) {
    const snap = await firestore
        .collection('families')
        .doc(familyId)
        .collection('completions')
        .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(todayStart))
        .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
        .get();
    const completedSet = new Set();
    snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'completed' ||
            data.status === 'approved' ||
            data.status === 'submitted') {
            completedSet.add(`${data.taskId}_${data.userId}`);
        }
    });
    return completedSet;
}
/**
 * Converte um Date para minutos desde meia-noite no timezone da família.
 */
function toLocalMinutes(date, timezone) {
    const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return local.getHours() * 60 + local.getMinutes();
}
/**
 * Retorna a data local (YYYY-MM-DD) no timezone da família.
 */
function toLocalDate(date, timezone) {
    const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return local;
}
//# sourceMappingURL=fcmHelper.js.map
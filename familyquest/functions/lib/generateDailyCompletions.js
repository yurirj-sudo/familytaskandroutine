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
exports.generateDailyCompletions = generateDailyCompletions;
const admin = __importStar(require("firebase-admin"));
const recurrence_1 = require("./recurrence");
/**
 * Gera completions diárias para todas as famílias.
 *
 * Idempotente: usa ID determinístico {taskId}_{uid}_{YYYY-MM-DD}.
 * Re-execuções seguras — já existentes são ignoradas silenciosamente.
 *
 * Trigger: Scheduler 00:01 BRT (05:01 UTC) — ver index.ts
 */
async function generateDailyCompletions() {
    const firestore = admin.firestore();
    const today = new Date();
    // normalize to midnight local (BRT = UTC-3)
    const dateStr = getBRTDateString(today);
    const dateForCheck = parseDateStr(dateStr);
    const familiesSnap = await firestore.collection('families').get();
    await Promise.all(familiesSnap.docs.map(async (familyDoc) => {
        const familyId = familyDoc.id;
        // Prevent duplicate generation for the same date
        const lastGenerated = familyDoc.data().lastGeneratedDate;
        if (lastGenerated === dateStr)
            return;
        const [tasksSnap, membersSnap] = await Promise.all([
            firestore
                .collection('families')
                .doc(familyId)
                .collection('tasks')
                .where('isActive', '==', true)
                .get(),
            firestore
                .collection('families')
                .doc(familyId)
                .collection('members')
                .where('isActive', '==', true)
                .get(),
        ]);
        const cycleId = getCycleId(dateForCheck);
        const batch = firestore.batch();
        let writes = 0;
        for (const taskDoc of tasksSnap.docs) {
            const task = Object.assign({ id: taskDoc.id }, taskDoc.data());
            if (!(0, recurrence_1.isTaskDueOnDate)(task, dateForCheck))
                continue;
            const assignedUids = task.assignedTo === 'all'
                ? membersSnap.docs.map((m) => m.id)
                : task.assignedTo;
            for (const uid of assignedUids) {
                const completionId = `${task.id}_${uid}_${dateStr}`;
                const ref = firestore
                    .collection('families')
                    .doc(familyId)
                    .collection('completions')
                    .doc(completionId);
                batch.set(ref, {
                    taskId: task.id,
                    taskTitle: taskDoc.data().title,
                    taskType: taskDoc.data().type,
                    userId: uid,
                    familyId,
                    status: 'pending',
                    pointsAwarded: 0,
                    photoProofUrl: null,
                    completedAt: null,
                    submittedAt: null,
                    reviewedAt: null,
                    reviewedBy: null,
                    rejectionReason: null,
                    dueDate: admin.firestore.Timestamp.fromDate(new Date(dateStr + 'T23:59:59')),
                    cycleId,
                    note: null,
                }, { merge: false });
                writes++;
                // Firestore batch limit
                if (writes === 499) {
                    await batch.commit();
                    writes = 0;
                }
            }
        }
        if (writes > 0)
            await batch.commit();
        // Mark family as generated for today
        await firestore.collection('families').doc(familyId).update({
            lastGeneratedDate: dateStr,
        });
    }));
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function getBRTDateString(utcDate) {
    // BRT = UTC-3
    const brt = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);
    return brt.toISOString().split('T')[0];
}
function parseDateStr(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}
function getCycleId(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
//# sourceMappingURL=generateDailyCompletions.js.map
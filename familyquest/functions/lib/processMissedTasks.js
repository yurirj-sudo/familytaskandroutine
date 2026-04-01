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
exports.processMissedTasks = processMissedTasks;
const admin = __importStar(require("firebase-admin"));
/**
 * Marca como 'missed' todas as completions 'pending' ou 'submitted' do dia anterior.
 * Para tarefas obrigatórias, aplica pointsOnMiss ao membro.
 *
 * Trigger: Scheduler 00:05 BRT (05:05 UTC) — ver index.ts
 */
async function processMissedTasks() {
    const firestore = admin.firestore();
    const yesterday = getYesterdayBRT();
    const yesterdayStart = new Date(yesterday + 'T00:00:00');
    const yesterdayEnd = new Date(yesterday + 'T23:59:59');
    const familiesSnap = await firestore.collection('families').get();
    await Promise.all(familiesSnap.docs.map(async (familyDoc) => {
        var _a;
        const familyId = familyDoc.id;
        // Find all pending/submitted completions from yesterday
        const missedSnap = await firestore
            .collection('families')
            .doc(familyId)
            .collection('completions')
            .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(yesterdayStart))
            .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(yesterdayEnd))
            .where('status', 'in', ['pending', 'submitted'])
            .get();
        if (missedSnap.empty)
            return;
        // Load task definitions for penalty lookup
        const taskIds = [...new Set(missedSnap.docs.map((d) => d.data().taskId))];
        const taskDocs = await Promise.all(taskIds.map((id) => firestore.collection('families').doc(familyId).collection('tasks').doc(id).get()));
        const taskMap = new Map(taskDocs.map((d) => [d.id, d.data()]));
        // Group missed by userId for bulk point deductions
        const penaltiesByUser = {};
        const batch = firestore.batch();
        let writes = 0;
        for (const completionDoc of missedSnap.docs) {
            const completion = completionDoc.data();
            const task = taskMap.get(completion.taskId);
            batch.update(completionDoc.ref, {
                status: 'missed',
                reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            writes++;
            // Apply penalty only for mandatory tasks
            if (task && task.type === 'mandatory' && task.pointsOnMiss < 0) {
                const uid = completion.userId;
                penaltiesByUser[uid] = ((_a = penaltiesByUser[uid]) !== null && _a !== void 0 ? _a : 0) + task.pointsOnMiss;
            }
            if (writes === 499) {
                await batch.commit();
                writes = 0;
            }
        }
        if (writes > 0)
            await batch.commit();
        // Apply point penalties in transactions
        await Promise.all(Object.entries(penaltiesByUser).map(async ([uid, penalty]) => {
            const memberRef = firestore
                .collection('families')
                .doc(familyId)
                .collection('members')
                .doc(uid);
            await firestore.runTransaction(async (tx) => {
                var _a, _b;
                const memberSnap = await tx.get(memberRef);
                if (!memberSnap.exists)
                    return;
                const current = (_b = (_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.totalPoints) !== null && _b !== void 0 ? _b : 0;
                // Points can't go below zero
                tx.update(memberRef, {
                    totalPoints: Math.max(0, current + penalty),
                });
            });
        }));
    }));
}
// ─── Helper ───────────────────────────────────────────────────────────────────
function getYesterdayBRT() {
    const now = new Date();
    // BRT = UTC-3
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    brt.setDate(brt.getDate() - 1);
    return brt.toISOString().split('T')[0];
}
//# sourceMappingURL=processMissedTasks.js.map
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
exports.closeMonthCycle = closeMonthCycle;
const admin = __importStar(require("firebase-admin"));
const db = () => admin.firestore();
function getCycleDocId(userId, year, month) {
    const mm = String(month).padStart(2, '0');
    return `${year}-${mm}_${userId}`;
}
/**
 * Fecha o ciclo do mes anterior para todas as familias.
 * - Agrega stats de completions do ciclo encerrado
 * - Se pointsMode === 'monthly_reset': zera totalPoints de cada membro
 * - Cria novo documento de ciclo ativo para o mes corrente
 *
 * Trigger: Scheduler dia 1 de cada mes, 00:10 BRT (03:10 UTC) — ver index.ts
 */
async function closeMonthCycle() {
    const firestore = db();
    const now = new Date();
    // We are on day 1 of the current month — close the PREVIOUS month
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();
    const prevMM = String(prevMonth).padStart(2, '0');
    const prevCyclePrefix = `${prevYear}-${prevMM}`;
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const familiesSnap = await firestore.collection('families').get();
    await Promise.all(familiesSnap.docs.map(async (familyDoc) => {
        var _a, _b;
        const familyId = familyDoc.id;
        const familyData = familyDoc.data();
        const pointsMode = (_b = (_a = familyData === null || familyData === void 0 ? void 0 : familyData.settings) === null || _a === void 0 ? void 0 : _a.pointsMode) !== null && _b !== void 0 ? _b : 'accumulate';
        // Get all active members
        const membersSnap = await firestore
            .collection('families')
            .doc(familyId)
            .collection('members')
            .where('isActive', '==', true)
            .get();
        await Promise.all(membersSnap.docs.map(async (memberDoc) => {
            const userId = memberDoc.id;
            // ── 1. Aggregate previous month completions ──────────────────────
            const completionsSnap = await firestore
                .collection('families')
                .doc(familyId)
                .collection('completions')
                .where('userId', '==', userId)
                .where('cycleId', '==', prevCyclePrefix)
                .get();
            let pointsEarned = 0;
            let pointsLost = 0;
            let tasksCompleted = 0;
            let tasksMissed = 0;
            completionsSnap.docs.forEach((d) => {
                var _a, _b;
                const c = d.data();
                if (c.status === 'completed' || c.status === 'approved') {
                    pointsEarned += (_a = c.pointsAwarded) !== null && _a !== void 0 ? _a : 0;
                    tasksCompleted++;
                }
                else if (c.status === 'missed') {
                    pointsLost += Math.abs((_b = c.pointsLost) !== null && _b !== void 0 ? _b : 0);
                    tasksMissed++;
                }
            });
            const totalTasks = tasksCompleted + tasksMissed;
            const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
            // Get redemptions for pointsSpent
            const redemptionsSnap = await firestore
                .collection('families')
                .doc(familyId)
                .collection('redemptions')
                .where('userId', '==', userId)
                .where('cycleId', '==', prevCyclePrefix)
                .get();
            const pointsSpent = redemptionsSnap.docs.reduce((sum, d) => { var _a; return sum + ((_a = d.data().pointsCost) !== null && _a !== void 0 ? _a : 0); }, 0);
            const finalScore = pointsEarned - pointsLost - pointsSpent;
            const prevCycleDocId = getCycleDocId(userId, prevYear, prevMonth);
            // ── 2. Close the previous cycle ─────────────────────────────────
            await firestore
                .collection('families')
                .doc(familyId)
                .collection('cycles')
                .doc(prevCycleDocId)
                .set({
                id: prevCycleDocId,
                familyId,
                userId,
                month: prevMonth,
                year: prevYear,
                pointsEarned,
                pointsLost,
                pointsSpent,
                finalScore,
                tasksCompleted,
                tasksMissed,
                completionRate,
                status: 'closed',
                closedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            // ── 3. Reset points if monthly_reset ────────────────────────────
            const memberRef = firestore
                .collection('families')
                .doc(familyId)
                .collection('members')
                .doc(userId);
            if (pointsMode === 'monthly_reset') {
                await memberRef.update({ totalPoints: 0 });
            }
            // ── 4. Open new cycle for current month ─────────────────────────
            const currentCycleDocId = getCycleDocId(userId, currentYear, currentMonth);
            const currentCycleRef = firestore
                .collection('families')
                .doc(familyId)
                .collection('cycles')
                .doc(currentCycleDocId);
            const existingSnap = await currentCycleRef.get();
            if (!existingSnap.exists) {
                await currentCycleRef.set({
                    id: currentCycleDocId,
                    familyId,
                    userId,
                    month: currentMonth,
                    year: currentYear,
                    pointsEarned: 0,
                    pointsLost: 0,
                    pointsSpent: 0,
                    finalScore: 0,
                    tasksCompleted: 0,
                    tasksMissed: 0,
                    completionRate: 0,
                    status: 'active',
                    openedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            console.log(`[closeMonthCycle] family=${familyId} user=${userId} ` +
                `closed=${prevCyclePrefix} earned=${pointsEarned} lost=${pointsLost} ` +
                `spent=${pointsSpent} rate=${completionRate}% reset=${pointsMode === 'monthly_reset'}`);
        }));
    }));
}
//# sourceMappingURL=closeMonthCycle.js.map
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
exports.handleCompletionUpdate = handleCompletionUpdate;
const admin = __importStar(require("firebase-admin"));
/**
 * Triggered when a completion document is updated.
 *
 * Handles two transitions:
 * 1. status → 'approved': credits pointsAwarded and recalculates streak
 * 2. status → 'completed': same (no-approval flow credit — idempotent guard)
 */
async function handleCompletionUpdate(familyId, completionBefore, completionAfter) {
    var _a;
    const before = completionBefore.status;
    const after = completionAfter.status;
    if (before === after)
        return;
    if (after !== 'approved' && after !== 'completed')
        return;
    const db = admin.firestore();
    const userId = completionAfter.userId;
    const pts = (_a = completionAfter.pointsAwarded) !== null && _a !== void 0 ? _a : 0;
    const memberRef = db
        .collection('families')
        .doc(familyId)
        .collection('members')
        .doc(userId);
    await db.runTransaction(async (tx) => {
        var _a, _b, _c, _d, _e;
        const memberSnap = await tx.get(memberRef);
        if (!memberSnap.exists)
            return;
        const member = memberSnap.data();
        // ── Credit points ────────────────────────────────────────────────────────
        const newTotal = ((_a = member.totalPoints) !== null && _a !== void 0 ? _a : 0) + pts;
        const newLifetime = ((_b = member.lifetimePoints) !== null && _b !== void 0 ? _b : 0) + pts;
        // ── Recalculate streak ───────────────────────────────────────────────────
        // A streak day is valid when ALL mandatory tasks for that day are completed/approved
        const dueDate = completionAfter.dueDate;
        const dueDateStr = dueDate.toDate().toISOString().split('T')[0];
        // Count how many mandatory completions exist for this member on this day
        // and how many are still pending/missed
        // We do this outside the transaction (reads inside tx have limits)
        const dayStart = new Date(dueDateStr + 'T00:00:00');
        const dayEnd = new Date(dueDateStr + 'T23:59:59');
        const dayCompletionsSnap = await db
            .collection('families')
            .doc(familyId)
            .collection('completions')
            .where('userId', '==', userId)
            .where('taskType', '==', 'mandatory')
            .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(dayStart))
            .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(dayEnd))
            .get();
        const allMandatoryDone = dayCompletionsSnap.docs.every((d) => {
            const s = d.id === completionAfter.id ? after : d.data().status;
            return s === 'completed' || s === 'approved';
        });
        let newStreak = (_c = member.currentStreak) !== null && _c !== void 0 ? _c : 0;
        let newLongest = (_d = member.longestStreak) !== null && _d !== void 0 ? _d : 0;
        if (allMandatoryDone) {
            // Check if yesterday had a valid streak
            const yesterday = new Date(dayStart);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const yesterdayStart = new Date(yesterdayStr + 'T00:00:00');
            const yesterdayEnd = new Date(yesterdayStr + 'T23:59:59');
            const yesterdayMandatorySnap = await db
                .collection('families')
                .doc(familyId)
                .collection('completions')
                .where('userId', '==', userId)
                .where('taskType', '==', 'mandatory')
                .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(yesterdayStart))
                .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(yesterdayEnd))
                .get();
            const yesterdayAllDone = yesterdayMandatorySnap.empty ||
                yesterdayMandatorySnap.docs.every((d) => {
                    const s = d.data().status;
                    return s === 'completed' || s === 'approved';
                });
            if (yesterdayAllDone) {
                newStreak = ((_e = member.currentStreak) !== null && _e !== void 0 ? _e : 0) + 1;
            }
            else {
                newStreak = 1; // reset streak
            }
            newLongest = Math.max(newStreak, newLongest);
        }
        tx.update(memberRef, {
            totalPoints: newTotal,
            lifetimePoints: newLifetime,
            currentStreak: newStreak,
            longestStreak: newLongest,
        });
    });
}
//# sourceMappingURL=onCompletionApproved.js.map
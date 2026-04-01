"use strict";
/**
 * Shared recurrence logic (mirrors src/utils/recurrence.ts in the frontend).
 * Keep in sync when modifying.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTaskDueOnDate = isTaskDueOnDate;
function isTaskDueOnDate(task, date) {
    var _a, _b, _c, _d;
    switch (task.frequency) {
        case 'daily':
            return true;
        case 'weekly':
            return (_b = (_a = task.activeDays) === null || _a === void 0 ? void 0 : _a.includes(date.getDay())) !== null && _b !== void 0 ? _b : false;
        case 'monthly':
            return date.getDate() === task.dayOfMonth;
        case 'monthly_relative': {
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const firstTarget = (((_c = task.dayOfWeekRelative) !== null && _c !== void 0 ? _c : 0) - firstDay.getDay() + 7) % 7;
            const targetDate = 1 + firstTarget + (((_d = task.weekOfMonth) !== null && _d !== void 0 ? _d : 1) - 1) * 7;
            return date.getDate() === targetDate;
        }
        case 'once':
            return task.startDate ? isSameDay(date, task.startDate) : false;
        default:
            return false;
    }
}
function isSameDay(a, b) {
    return (a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate());
}
//# sourceMappingURL=recurrence.js.map
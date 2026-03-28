/**
 * Shared recurrence logic (mirrors src/utils/recurrence.ts in the frontend).
 * Keep in sync when modifying.
 */

export interface TaskRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'monthly_relative' | 'once';
  activeDays?: number[];
  dayOfMonth?: number;
  weekOfMonth?: 1 | 2 | 3 | 4;
  dayOfWeekRelative?: number;
  startDate?: Date;
  assignedTo: string[] | 'all';
  isActive: boolean;
  id: string;
}

export function isTaskDueOnDate(task: TaskRecurrence, date: Date): boolean {
  switch (task.frequency) {
    case 'daily':
      return true;

    case 'weekly':
      return task.activeDays?.includes(date.getDay()) ?? false;

    case 'monthly':
      return date.getDate() === task.dayOfMonth;

    case 'monthly_relative': {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstTarget = ((task.dayOfWeekRelative ?? 0) - firstDay.getDay() + 7) % 7;
      const targetDate = 1 + firstTarget + ((task.weekOfMonth ?? 1) - 1) * 7;
      return date.getDate() === targetDate;
    }

    case 'once':
      return task.startDate ? isSameDay(date, task.startDate) : false;

    default:
      return false;
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

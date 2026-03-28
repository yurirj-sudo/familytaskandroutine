import type { Task } from '../types';

/**
 * Verifica se uma tarefa está com prazo hoje, baseado na frequência configurada.
 * Suporta: daily, weekly, monthly, monthly_relative, once.
 */
export function isTaskDueToday(task: Task, date: Date = new Date()): boolean {
  switch (task.frequency) {
    case 'daily':
      return true;

    case 'weekly':
      return task.activeDays?.includes(date.getDay()) ?? false;

    case 'monthly':
      return date.getDate() === task.dayOfMonth;

    case 'monthly_relative': {
      // Ex: weekOfMonth=2, dayOfWeekRelative=4 → 2ª quinta-feira do mês
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstTarget = (task.dayOfWeekRelative! - firstDay.getDay() + 7) % 7;
      const targetDate = 1 + firstTarget + (task.weekOfMonth! - 1) * 7;
      return date.getDate() === targetDate;
    }

    case 'once':
      return task.startDate ? isSameDay(date, task.startDate) : false;

    default:
      return false;
  }
}

/**
 * Verifica se duas datas são o mesmo dia (ignora horário).
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Retorna as próximas N datas em que a tarefa ocorrerá (a partir de amanhã).
 * Útil para mostrar preview ao criar/editar uma tarefa.
 */
export function getNextOccurrences(task: Task, count: number = 3): string[] {
  const results: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1); // começa amanhã

  let attempts = 0;
  while (results.length < count && attempts < 365) {
    if (isTaskDueToday(task, cursor)) {
      results.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
    attempts++;
  }
  return results;
}

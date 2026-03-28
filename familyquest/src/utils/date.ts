/**
 * Retorna o ID do ciclo atual no formato "YYYY-MM".
 * Ex: "2025-03"
 */
export function getCurrentCycleId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Retorna o ID do ciclo para uma data específica.
 */
export function getCycleId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formata uma data para exibição em pt-BR.
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formata uma data com dia da semana em pt-BR.
 * Ex: "Segunda-feira, 10 de março"
 */
export function formatDateFull(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/**
 * Formata hora no formato HH:MM.
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Retorna a data de hoje no formato "YYYY-MM-DD" para uso em IDs de completion.
 */
export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Gera o ID determinístico de uma completion.
 * Formato: "{taskId}_{uid}_{YYYY-MM-DD}"
 */
export function getCompletionId(taskId: string, uid: string, date?: string): string {
  const dateStr = date || getTodayString();
  return `${taskId}_${uid}_${dateStr}`;
}

/**
 * Retorna o nome do mês em pt-BR.
 */
export function getMonthName(month: number): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
    new Date(2024, month - 1)
  );
}

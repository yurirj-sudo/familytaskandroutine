/**
 * Formata número de pontos para exibição.
 * Ex: 1500 → "1.500 pts"
 */
export function formatPoints(points: number): string {
  return `${points.toLocaleString('pt-BR')} pts`;
}

/**
 * Formata pontos com sinal (para ganhos/perdas).
 * Ex: 10 → "+10 pts", -5 → "-5 pts"
 */
export function formatPointsDelta(delta: number): string {
  const abs = Math.abs(delta).toLocaleString('pt-BR');
  return delta >= 0 ? `+${abs} pts` : `-${abs} pts`;
}

/**
 * Retorna a cor CSS para um delta de pontos.
 */
export function getPointsDeltaColor(delta: number): string {
  return delta >= 0 ? '#22C55E' : '#EF4444';
}

/**
 * Calcula o percentual de progresso com segurança (sem divisão por zero).
 */
export function calcCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

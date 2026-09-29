// Aviso de sobrecarga de acciones prioritarias (M1.6e): si la semana actual
// tiene más prioritarias que la media de completadas en las 4 semanas
// anteriores + 1, se avisa (nunca bloquea).

export function averageCompleted(recentCompletedCounts: number[]): number {
  if (recentCompletedCounts.length === 0) return 0;
  const sum = recentCompletedCounts.reduce((a, b) => a + b, 0);
  return sum / recentCompletedCounts.length;
}

export function shouldWarnOverload(currentCount: number, recentCompletedCounts: number[]): boolean {
  if (currentCount === 0) return false;
  return currentCount > averageCompleted(recentCompletedCounts) + 1;
}

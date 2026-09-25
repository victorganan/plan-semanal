// Microayuda rotatoria del Arranque del día (Apéndice A.2.3): un consejo
// breve distinto cada día, estable durante todo ese día (no cambia al
// recargar), sin necesidad de guardar nada.
export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function pickDailyTip<T>(tips: readonly T[], date: Date): T {
  return tips[dayOfYear(date) % tips.length];
}

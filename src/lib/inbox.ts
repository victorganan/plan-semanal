import type { TaskWithProject } from '@/types';

// Misma definición de "Bandeja pendiente de procesar" en todos los sitios
// que la muestran: la pestaña Bandeja, el badge del menú (via
// getInboxPendingCount, réplica de esta regla en SQL) y las líneas
// compactas de Hoy/Semana.
export function hasReappeared(t: TaskWithProject, today: Date = new Date()): boolean {
  return t.gtdStatus === 'ALGUN_DIA' && !!t.snoozeUntil && new Date(t.snoozeUntil) <= today;
}

export function isPendingProcess(t: TaskWithProject, today: Date = new Date()): boolean {
  return !t.done && t.gtdStatus === 'ACTIVA' && (t.processedAt === null || hasReappeared(t, today));
}

export function countPendingProcess(tasks: TaskWithProject[]): number {
  const today = new Date();
  return tasks.filter((t) => isPendingProcess(t, today)).length;
}

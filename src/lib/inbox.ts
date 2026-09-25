import type { TaskWithProject } from '@/types';

// Misma definición de "Bandeja pendiente de procesar" en todos los sitios
// que la muestran: la pestaña Bandeja, el badge del menú (via
// getInboxPendingCount, réplica de esta regla en SQL) y las líneas
// compactas de Hoy/Semana.
export function hasReappeared(t: TaskWithProject, today: Date = new Date()): boolean {
  return t.gtdStatus === 'ALGUN_DIA' && !!t.snoozeUntil && new Date(t.snoozeUntil) <= today;
}

export function isPendingProcess(t: TaskWithProject, today: Date = new Date()): boolean {
  if (t.done) return false;
  // "gtdStatus === 'ACTIVA' && hasReappeared(...)" nunca puede darse a la
  // vez (hasReappeared exige ALGUN_DIA): son dos casos alternativos, no uno
  // combinado. Antes iban unidos con un único && y la reaparición nunca
  // contaba: una tarea con recordatorio de hoy quedaba invisible en
  // cualquier pestaña (ni Algún día, que ya la excluye, ni Bandeja).
  if (t.gtdStatus === 'ACTIVA') return t.processedAt === null;
  return hasReappeared(t, today);
}

export function countPendingProcess(tasks: TaskWithProject[]): number {
  const today = new Date();
  return tasks.filter((t) => isPendingProcess(t, today)).length;
}

export interface TriageSessionSummary {
  allProcessed: boolean;
  processedCount: number;
  remainingCount: number;
}

// Resumen al terminar una pasada del asistente de Bandeja. "Saltar por
// ahora" no procesa la tarea (sigue con processedAt = null): si se saltó
// alguna, la cola local del asistente llega a su fin sin que la Bandeja
// esté realmente vacía, así que el mensaje final no puede ser fijo.
export function summarizeTriageSession(totalInQueue: number, skippedCount: number): TriageSessionSummary {
  return {
    allProcessed: skippedCount === 0,
    processedCount: totalInQueue - skippedCount,
    remainingCount: skippedCount,
  };
}

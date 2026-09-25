import type { TaskWithProject } from '@/types';

type LoadTask = Pick<TaskWithProject, 'gtdStatus' | 'durationMinutes'>;

// Fórmula de Carga (sección 10): tareas del día (completadas y pendientes),
// excluidas Esperando y Algún día. No filtra por `done` a propósito: una
// tarea completada sigue contando lo que ocupó del día.
export function isCountedInLoad(t: Pick<TaskWithProject, 'gtdStatus'>): boolean {
  return t.gtdStatus !== 'ESPERANDO' && t.gtdStatus !== 'ALGUN_DIA';
}

export interface LoadSummary {
  plannedMinutes: number;
  unestimatedCount: number;
}

// Las tareas sin duración estimada cuentan 30 min por defecto (sección 10 /
// M4.2), y se avisa de cuántas se han estimado así.
export function summarizeLoad(tasks: LoadTask[]): LoadSummary {
  const counted = tasks.filter(isCountedInLoad);
  return {
    plannedMinutes: counted.reduce((sum, t) => sum + (t.durationMinutes ?? 30), 0),
    unestimatedCount: counted.filter((t) => !t.durationMinutes).length,
  };
}

// Capacidad (día) = Disponible × (1 − margen de maniobra). Sin lectura de
// Calendar todavía, Disponible se simplifica a dailyCapacityMinutes (ajuste
// de usuario) tal como ya estaba.
export function effectiveCapacity(capacityMinutes: number, bufferPercent: number): number {
  return Math.round(capacityMinutes * (1 - bufferPercent / 100));
}

export type LoadColor = 'ok' | 'warn' | 'over';

// verde ≤ 85 %, ámbar 86-100 %, rojo > 100 % (M4.2).
export function loadColor(pct: number): LoadColor {
  if (pct > 100) return 'over';
  if (pct > 85) return 'warn';
  return 'ok';
}

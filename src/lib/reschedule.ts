// Regla del contador de reprogramaciones (rescheduleCount, sección 8.3 de la
// especificación de evolución): solo cuenta cuando se POSPONE una tarea ya
// programada. No cuenta: asignar fecha por primera vez, cambiar solo la hora
// dentro del mismo día, adelantar la fecha, ni pasar la tarea a Algún día o
// Esperando (son decisiones deliberadas, no "se me ha colado otra vez").

export interface RescheduleCheckInput {
  done: boolean;
  previousEffectiveDate: Date | null; // fecha efectiva antes del cambio (solo día)
  nextEffectiveDate: Date | null; // fecha efectiva después del cambio (solo día)
  movingToDeferred: boolean; // el propio cambio manda la tarea a Algún día o Esperando
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function shouldIncrementRescheduleCount({
  done,
  previousEffectiveDate,
  nextEffectiveDate,
  movingToDeferred,
}: RescheduleCheckInput): boolean {
  if (done) return false;
  if (movingToDeferred) return false;
  if (!previousEffectiveDate || !nextEffectiveDate) return false; // sin fecha antes, o se le quita: no es posponer

  const prevDay = startOfUtcDay(previousEffectiveDate);
  const nextDay = startOfUtcDay(nextEffectiveDate);
  return nextDay > prevDay;
}

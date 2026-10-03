import { isoWeekAndDowFor, nextMondayLocalString, todayLocalString, tomorrowLocalString } from './week';

type MovableTask = {
  kind: string;
  areaId: string | null;
  scheduledAt: Date | string | null;
  project?: { areaId: string } | null;
};

// "Mover a una fecha" sin abrir el editor (atajo M → 1/2/3 y selección
// múltiple): la tarea pasa a ese día en su área (la suya o la de su
// proyecto; si no tiene, la de reserva). Conserva la hora si ya tenía.
// Devuelve null si no hay ningún área con la que colocarla en un día.
export function movePatchFor(task: MovableTask, dateStr: string, fallbackAreaId?: string | null): Record<string, unknown> | null {
  const areaId = task.areaId ?? task.project?.areaId ?? fallbackAreaId ?? null;
  if (!areaId) return null;
  const { isoWeek, dayOfWeek } = isoWeekAndDowFor(dateStr);
  const patch: Record<string, unknown> = { kind: 'DAY_AREA', isoWeek, dayOfWeek, areaId };
  if (task.scheduledAt) {
    const d = new Date(task.scheduledAt);
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    patch.scheduledAt = new Date(`${dateStr}T${hhmm}`).toISOString();
  }
  return patch;
}

// Teclas del atajo M: 1 = hoy, 2 = mañana, 3 = lunes que viene.
export function quickMoveDate(key: string): string | null {
  if (key === '1') return todayLocalString();
  if (key === '2') return tomorrowLocalString();
  if (key === '3') return nextMondayLocalString();
  return null;
}

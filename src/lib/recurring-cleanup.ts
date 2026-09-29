// Decide qué tareas sobran dentro de un grupo (misma plantilla recurrente +
// misma semana) y cuál conservar, dado cuántas esperaba esa semana el
// patrón de repetición. Usado para limpiar los duplicados que generaba el
// bug de materializeRecurringTasks (src/lib/recurring.ts): la tarea que el
// usuario movió a otro día es siempre la más antigua del grupo (se creó en
// la primera carga y solo se editó su día); la(s) regenerada(s) por el bug
// es/son siempre más reciente(s) (se crearon en una carga posterior, al
// encontrar "vacío" el día original). Nunca decide borrar una tarea
// completada: si alguna de las que sobran ya está hecha, no toca el grupo.
export interface CleanupTask {
  id: string;
  done: boolean;
}

export interface CleanupDecision {
  keepId: string | null;
  deleteIds: string[];
  skippedReason: string | null;
}

// tasksOldestFirst: tareas del grupo ordenadas por createdAt ascendente.
export function selectDuplicatesToDelete(tasksOldestFirst: CleanupTask[], expectedCount: number): CleanupDecision {
  if (tasksOldestFirst.length === 0) return { keepId: null, deleteIds: [], skippedReason: null };

  const excess = tasksOldestFirst.length - expectedCount;
  const keep = tasksOldestFirst[0];
  if (excess <= 0) return { keepId: keep.id, deleteIds: [], skippedReason: null };

  const toDelete = tasksOldestFirst.slice(-excess);
  if (toDelete.some((t) => t.done)) {
    return { keepId: keep.id, deleteIds: [], skippedReason: 'una de las copias "de más" está completada: revisar a mano' };
  }
  return { keepId: keep.id, deleteIds: toDelete.map((t) => t.id), skippedReason: null };
}

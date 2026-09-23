export interface OrderableTask {
  id: string;
  scheduledAt: Date | string | null;
  order: number;
}

function timeOfDay(d: Date | string | null): number | null {
  if (!d) return null;
  const date = new Date(d);
  return date.getHours() * 60 + date.getMinutes();
}

// Reordena un grupo de tareas de un mismo día+área por hora de ejecución
// (ascendente). Las tareas sin hora se quedan al final, respetando su orden
// relativo anterior — así una reordenación manual entre tareas sin hora no
// se deshace cuando otra tarea del mismo grupo cambia de hora.
export function resortByScheduledTime<T extends OrderableTask>(tasks: T[]): T[] {
  const sorted = [...tasks].sort((a, b) => a.order - b.order);
  const withTime = sorted.filter((t) => timeOfDay(t.scheduledAt) !== null);
  const withoutTime = sorted.filter((t) => timeOfDay(t.scheduledAt) === null);
  withTime.sort((a, b) => timeOfDay(a.scheduledAt)! - timeOfDay(b.scheduledAt)!);
  return [...withTime, ...withoutTime];
}

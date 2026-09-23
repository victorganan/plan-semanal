import { prisma } from '@/lib/prisma';

/**
 * Si la tarea tiene subtareas, su estado "hecha" se deriva de ellas
 * (hecha solo cuando todas lo están). Si cambia, se guarda y se propaga
 * hacia arriba por si esta tarea es a su vez subtarea de otra.
 */
export async function syncParentCompletion(taskId: string): Promise<void> {
  const parent = await prisma.task.findUnique({ where: { id: taskId }, include: { subtasks: true } });
  if (!parent || parent.subtasks.length === 0) return;

  const allDone = parent.subtasks.every((s) => s.done);
  if (parent.done !== allDone) {
    await prisma.task.update({ where: { id: taskId }, data: { done: allDone } });
    if (parent.parentTaskId) await syncParentCompletion(parent.parentTaskId);
  }
}

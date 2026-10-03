import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { syncParentCompletion } from '@/lib/subtasks';
import { applyTaskPatch, patchSchema } from '@/lib/task-update';

// Selección múltiple (Hoy, Semana, Bandeja y Tareas): varias tareas en una
// sola petición. Cada actualización lleva su propio patch (p.ej. "mover"
// conserva la hora y el área de cada tarea) y pasa por las mismas reglas
// que PATCH /api/tasks/[id]. Las tareas ajenas o inexistentes se ignoran y
// se cuentan como fallidas.
const batchSchema = z.union([
  z.object({ updates: z.array(z.object({ id: z.string(), patch: patchSchema })).min(1).max(200) }),
  z.object({ deleteIds: z.array(z.string()).min(1).max(200) }),
]);

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const parsed = batchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Selección no válida' }, { status: 400 });
  const body = parsed.data;

  const ids = 'updates' in body ? body.updates.map((u) => u.id) : body.deleteIds;
  const owned = await prisma.task.findMany({ where: { id: { in: ids }, userId } });
  const byId = new Map(owned.map((t) => [t.id, t]));
  const failed: { id: string; error: string }[] = ids.filter((id) => !byId.has(id)).map((id) => ({ id, error: 'No encontrada' }));
  let done = 0;

  if ('updates' in body) {
    // En serie: varias tareas del mismo día se reordenan entre sí.
    for (const { id, patch } of body.updates) {
      const existing = byId.get(id);
      if (!existing) continue;
      const result = await applyTaskPatch(userId, existing, patch);
      if (result.ok) done += 1;
      else failed.push({ id, error: result.error });
    }
  } else {
    await prisma.task.deleteMany({ where: { id: { in: owned.map((t) => t.id) }, userId } });
    done = owned.length;
    const parents = new Set(owned.map((t) => t.parentTaskId).filter((p): p is string => !!p && !byId.has(p)));
    for (const parentId of parents) await syncParentCompletion(parentId);
    await logActivity(prisma, {
      userId,
      entityType: 'Task',
      entityId: owned[0]?.id ?? 'batch',
      action: 'DELETED',
      summary: `${owned.length} tareas eliminadas a la vez`,
    });
  }

  return NextResponse.json({ done, failed });
}

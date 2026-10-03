import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { syncParentCompletion } from '@/lib/subtasks';
import { applyTaskPatch, patchSchema } from '@/lib/task-update';

async function loadOwnedTask(userId: string, id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== userId) return null;
  return task;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const existing = await loadOwnedTask(userId, id);
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const result = await applyTaskPatch(userId, existing, patchSchema.parse(await req.json()));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.task);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const existing = await loadOwnedTask(userId, id);
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  await prisma.task.delete({ where: { id } });

  if (existing.parentTaskId) {
    await syncParentCompletion(existing.parentTaskId);
  }

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: id,
    action: 'DELETED',
    summary: `Tarea eliminada: "${existing.text}"`,
  });

  return NextResponse.json({ ok: true });
}

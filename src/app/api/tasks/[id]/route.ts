import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

const patchSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  done: z.boolean().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  duration: z.enum(['LT_HALF', 'HALF_TO_ONE', 'ONE_TO_TWO', 'GT_TWO']).nullable().optional(),
  projectId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  recurrence: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'FOUR_WEEKLY']).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  order: z.number().int().optional(),
});

async function loadOwnedTask(userId: string, id: string) {
  const task = await prisma.task.findUnique({ where: { id }, include: { week: true } });
  if (!task || task.week.userId !== userId) return null;
  return task;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const existing = await loadOwnedTask(userId, id);
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const body = patchSchema.parse(await req.json());
  const { dayOfWeek, scheduledAt, ...rest } = body;

  let dayId: string | undefined;
  if (dayOfWeek !== undefined) {
    const day = await prisma.day.findUnique({
      where: { weekId_dayOfWeek: { weekId: existing.weekId, dayOfWeek } },
    });
    dayId = day?.id;
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(dayId ? { dayId } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
    },
  });

  let action: 'UPDATED' | 'COMPLETED' | 'UNCOMPLETED' = 'UPDATED';
  if (body.done === true && !existing.done) action = 'COMPLETED';
  if (body.done === false && existing.done) action = 'UNCOMPLETED';

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: task.id,
    action,
    summary:
      action === 'COMPLETED'
        ? `Tarea completada: "${task.text}"`
        : action === 'UNCOMPLETED'
          ? `Tarea marcada como pendiente: "${task.text}"`
          : `Tarea actualizada: "${task.text}"`,
  });

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const existing = await loadOwnedTask(userId, id);
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  await prisma.task.delete({ where: { id } });

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: id,
    action: 'DELETED',
    summary: `Tarea eliminada: "${existing.text}"`,
  });

  return NextResponse.json({ ok: true });
}

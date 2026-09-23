import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';
import { durationMinutesSchema } from '@/lib/validation';

const patchSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  done: z.boolean().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  durationMinutes: durationMinutesSchema,
  projectId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  recurrence: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'FOUR_WEEKLY']).optional(),
  order: z.number().int().optional(),
  // Mover/promocionar una tarea a un día concreto (p.ej. desde la bandeja de entrada, o al arrastrarla)
  kind: z.enum(['DAY_AREA', 'PRIORITY_ACTION', 'CALL', 'BACKLOG']).optional(),
  isoWeek: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  areaId: z.string().nullable().optional(),
});

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

  const body = patchSchema.parse(await req.json());
  const { dayOfWeek, isoWeek, kind, areaId, scheduledAt, ...rest } = body;

  const nextKind = kind ?? existing.kind;
  const data: Record<string, unknown> = { ...rest };
  if (kind) data.kind = kind;
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

  if (nextKind === 'BACKLOG') {
    data.weekId = null;
    data.dayId = null;
    data.areaId = null;
  } else {
    let weekId = existing.weekId ?? undefined;
    if (isoWeek) {
      const week = await getOrCreateWeek(userId, isoWeek);
      weekId = week.id;
      data.weekId = weekId;
    }

    if (nextKind === 'DAY_AREA') {
      if (areaId !== undefined) data.areaId = areaId;
      if (dayOfWeek !== undefined && weekId) {
        const day = await prisma.day.findUnique({ where: { weekId_dayOfWeek: { weekId, dayOfWeek } } });
        data.dayId = day?.id ?? null;
      }
    } else {
      data.dayId = null;
      data.areaId = null;
    }
  }

  const task = await prisma.task.update({ where: { id }, data });

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

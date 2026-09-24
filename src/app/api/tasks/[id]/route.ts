import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';
import { durationMinutesSchema, executedMinutesSchema } from '@/lib/validation';
import { syncParentCompletion } from '@/lib/subtasks';
import { resortByScheduledTime } from '@/lib/task-order';
import { shouldIncrementRescheduleCount } from '@/lib/reschedule';
import { dateForDayOfWeek } from '@/lib/week';

const patchSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  done: z.boolean().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  durationMinutes: durationMinutesSchema,
  executedMinutes: executedMinutesSchema,
  projectId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  order: z.number().int().optional(),
  // Mover/promocionar una tarea a un día concreto (p.ej. desde la bandeja de entrada, o al arrastrarla)
  kind: z.enum(['DAY_AREA', 'PRIORITY_ACTION', 'CALL', 'BACKLOG']).optional(),
  isoWeek: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  areaId: z.string().nullable().optional(),
  quadrant: z.enum(['HACER', 'DECIDIR', 'DELEGAR', 'ALGUN_DIA']).nullable().optional(),
  assignedTo: z.string().max(100).nullable().optional(),
  isTop3: z.boolean().optional(),
  tagIds: z.array(z.string()).max(20).optional(),
  isPriority: z.boolean().optional(),
  firstStep: z.string().max(120).nullable().optional(),
  context: z.string().max(50).nullable().optional(),
  gtdStatus: z.enum(['ACTIVA', 'ESPERANDO', 'ALGUN_DIA']).optional(),
  waitingOn: z.string().max(100).nullable().optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  snoozeUntil: z.string().datetime().nullable().optional(),
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
  const { dayOfWeek, isoWeek, kind, areaId, scheduledAt, tagIds, followUpDate, snoozeUntil, ...rest } = body;

  const nextKind = kind ?? existing.kind;
  const data: Record<string, unknown> = { ...rest };
  if (kind) data.kind = kind;
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  if (followUpDate !== undefined) data.followUpDate = followUpDate ? new Date(followUpDate) : null;
  if (snoozeUntil !== undefined) data.snoozeUntil = snoozeUntil ? new Date(snoozeUntil) : null;
  if (tagIds !== undefined) {
    // Solo etiquetas propias del usuario: evita asociar ids ajenos adivinados.
    const owned = await prisma.tag.findMany({ where: { id: { in: tagIds }, userId }, select: { id: true } });
    data.tags = { set: owned.map((t) => ({ id: t.id })) };
  }

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

  // Si la tarea cambia de día (o sale de DAY_AREA), su marca de Top 3 ya no aplica.
  if ('dayId' in data && data.dayId !== existing.dayId && body.isTop3 === undefined && existing.isTop3) {
    data.isTop3 = false;
  }

  if (body.isTop3 === true) {
    const effectiveDayId = 'dayId' in data ? (data.dayId as string | null) : existing.dayId;
    if (!effectiveDayId) {
      return NextResponse.json({ error: 'Solo se pueden destacar tareas asignadas a un día' }, { status: 400 });
    }
    const top3Count = await prisma.task.count({ where: { dayId: effectiveDayId, isTop3: true, id: { not: id } } });
    if (top3Count >= 3) {
      return NextResponse.json({ error: 'Ya tienes 3 tareas destacadas para ese día' }, { status: 400 });
    }
  }

  // La tarea sale de "bandeja sin procesar" (processedAt = null) la primera vez que:
  // se programa a un día/prioritaria/llamada, se marca esperando/algún día, o se
  // completa directamente (regla de los 2 minutos). No se expone como campo
  // editable a mano: lo deriva el propio backend para que ninguna pantalla se
  // olvide de marcarlo.
  if (existing.processedAt === null) {
    const leavesBacklog = nextKind !== 'BACKLOG' && existing.kind === 'BACKLOG';
    const getsGtdStatus = body.gtdStatus !== undefined && body.gtdStatus !== existing.gtdStatus;
    const getsCompleted = body.done === true;
    if (leavesBacklog || getsGtdStatus || getsCompleted) {
      data.processedAt = new Date();
    }
  }

  // Contador de reprogramaciones (sección 8.3): solo cuenta posponer una tarea
  // no completada a un día posterior; ver src/lib/reschedule.ts para la regla.
  let nextEffectiveDate: Date | null | undefined;
  if (data.scheduledAt !== undefined) {
    nextEffectiveDate = data.scheduledAt as Date | null;
  } else if (isoWeek !== undefined && dayOfWeek !== undefined) {
    nextEffectiveDate = dateForDayOfWeek(isoWeek, dayOfWeek);
  } else if (nextKind === 'BACKLOG' && existing.kind !== 'BACKLOG') {
    nextEffectiveDate = null;
  }
  if (nextEffectiveDate !== undefined) {
    let previousEffectiveDate: Date | null = existing.scheduledAt;
    if (!previousEffectiveDate && existing.dayId) {
      const previousDay = await prisma.day.findUnique({ where: { id: existing.dayId }, include: { week: true } });
      if (previousDay) previousEffectiveDate = dateForDayOfWeek(previousDay.week.isoWeek, previousDay.dayOfWeek);
    }
    const nextGtdStatus = body.gtdStatus ?? existing.gtdStatus;
    const movingToDeferred =
      body.quadrant === 'ALGUN_DIA' || nextGtdStatus === 'ESPERANDO' || nextGtdStatus === 'ALGUN_DIA';
    if (
      shouldIncrementRescheduleCount({
        done: body.done ?? existing.done,
        previousEffectiveDate,
        nextEffectiveDate,
        movingToDeferred,
      })
    ) {
      data.rescheduleCount = existing.rescheduleCount + 1;
    }
  }

  let task = await prisma.task.update({ where: { id }, data, include: { tags: true } });

  // Por defecto, las tareas de un mismo día+área se ordenan por hora de
  // ejecución: si cambia la hora, o si la tarea entra en un día/área nuevo,
  // reordenamos ese grupo entero (las que no tienen hora mantienen su orden
  // relativo, así una reordenación manual entre ellas no se pierde).
  const scheduledAtChanging = scheduledAt !== undefined;
  const dayOrAreaChanging = 'dayId' in data || 'areaId' in data;
  if (task.kind === 'DAY_AREA' && task.dayId && task.areaId && (scheduledAtChanging || dayOrAreaChanging)) {
    const bucket = await prisma.task.findMany({
      where: { dayId: task.dayId, areaId: task.areaId, kind: 'DAY_AREA' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, scheduledAt: true, order: true },
    });
    const resorted = resortByScheduledTime(bucket);
    await prisma.$transaction(resorted.map((t, i) => prisma.task.update({ where: { id: t.id }, data: { order: i } })));
    task = await prisma.task.findUniqueOrThrow({ where: { id }, include: { tags: true } });
  }

  if (body.done !== undefined) {
    // Si es un miniproyecto (tiene subtareas), marcar/desmarcar se aplica
    // en cascada a todas ellas; si esta tarea es a su vez subtarea de otra,
    // su padre se recalcula (hecho solo cuando todas sus subtareas lo están).
    const subtaskCount = await prisma.task.count({ where: { parentTaskId: id } });
    if (subtaskCount > 0) {
      await prisma.task.updateMany({ where: { parentTaskId: id }, data: { done: body.done } });
    }
    if (existing.parentTaskId) {
      await syncParentCompletion(existing.parentTaskId);
    }
  }

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

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';
import { durationMinutesSchema } from '@/lib/validation';
import { syncParentCompletion } from '@/lib/subtasks';

const createSchema = z.object({
  isoWeek: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  kind: z.enum(['DAY_AREA', 'PRIORITY_ACTION', 'CALL', 'BACKLOG']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  areaId: z.string().optional(),
  text: z.string().min(1).max(500),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  durationMinutes: durationMinutesSchema,
  projectId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  parentTaskId: z.string().optional(),
  quadrant: z.enum(['HACER', 'DECIDIR', 'DELEGAR', 'ALGUN_DIA']).nullable().optional(),
  assignedTo: z.string().max(100).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());

  if (body.parentTaskId) {
    const parent = await prisma.task.findUnique({ where: { id: body.parentTaskId } });
    if (!parent || parent.userId !== userId) {
      return NextResponse.json({ error: 'Tarea padre no encontrada' }, { status: 404 });
    }
    if (parent.parentTaskId) {
      return NextResponse.json({ error: 'Una subtarea no puede tener a su vez subtareas' }, { status: 400 });
    }
  }

  if (body.kind === 'DAY_AREA' && (body.dayOfWeek === undefined || !body.areaId)) {
    return NextResponse.json({ error: 'dayOfWeek y areaId son obligatorios para tareas de día' }, { status: 400 });
  }
  if (body.kind !== 'BACKLOG' && !body.isoWeek) {
    return NextResponse.json({ error: 'isoWeek es obligatorio salvo para la bandeja de entrada' }, { status: 400 });
  }

  let weekId: string | undefined;
  let dayId: string | undefined;

  if (body.kind !== 'BACKLOG') {
    const week = await getOrCreateWeek(userId, body.isoWeek!);
    weekId = week.id;
    if (body.kind === 'DAY_AREA') {
      const day = await prisma.day.findUnique({
        where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek: body.dayOfWeek! } },
      });
      dayId = day?.id;
    }
  }

  const maxOrder = await prisma.task.aggregate({
    where:
      body.kind === 'DAY_AREA'
        ? { dayId, areaId: body.areaId }
        : body.kind === 'BACKLOG'
          ? { userId, kind: 'BACKLOG' }
          : { weekId, kind: body.kind },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      userId,
      weekId,
      dayId,
      kind: body.kind,
      areaId: body.kind === 'DAY_AREA' ? body.areaId : undefined,
      text: body.text,
      description: body.description ?? undefined,
      priority: body.priority ?? 'MEDIUM',
      durationMinutes: body.durationMinutes ?? undefined,
      projectId: body.projectId ?? undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      recurrence: body.recurrence ?? 'NONE',
      order: (maxOrder._max.order ?? -1) + 1,
      parentTaskId: body.parentTaskId,
      quadrant: body.quadrant ?? undefined,
      assignedTo: body.assignedTo ?? undefined,
      // Ya nace "procesada" si no entra en la Bandeja (no es BACKLOG suelta) o es una subtarea.
      processedAt: body.kind !== 'BACKLOG' || body.parentTaskId ? new Date() : undefined,
    },
  });

  if (body.parentTaskId) {
    await syncParentCompletion(body.parentTaskId);
  }

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: task.id,
    action: 'CREATED',
    summary: `Tarea creada: "${task.text}"`,
  });

  return NextResponse.json(task, { status: 201 });
}

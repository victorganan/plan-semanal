import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';

const createSchema = z.object({
  isoWeek: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  kind: z.enum(['DAY_AREA', 'PRIORITY_ACTION', 'CALL', 'BACKLOG']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  areaId: z.string().optional(),
  text: z.string().min(1).max(500),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  duration: z.enum(['LT_HALF', 'HALF_TO_ONE', 'ONE_TO_TWO', 'GT_TWO']).nullable().optional(),
  projectId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  recurrence: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'FOUR_WEEKLY']).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());

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
      priority: body.priority ?? 'MEDIUM',
      duration: body.duration ?? undefined,
      projectId: body.projectId ?? undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      recurrence: body.recurrence ?? 'NONE',
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: task.id,
    action: 'CREATED',
    summary: `Tarea creada: "${task.text}"`,
  });

  return NextResponse.json(task, { status: 201 });
}

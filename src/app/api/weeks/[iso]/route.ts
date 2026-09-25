import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ iso: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { iso } = await params;
  const week = await getOrCreateWeek(userId, iso);

  const full = await prisma.week.findUnique({
    where: { id: week.id },
    include: {
      days: { orderBy: { dayOfWeek: 'asc' } },
      tasks: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: {
          project: { include: { area: true, collaborators: true } },
          area: true,
          subtasks: true,
          recurringTemplate: true,
          tags: true,
        },
      },
      habitCompletions: true,
      projectFocus: { include: { project: { include: { area: true } } } },
    },
  });

  return NextResponse.json(full);
}

const patchSchema = z.object({
  mentalState: z.number().int().min(1).max(5).nullable().optional(),
  physicalState: z.number().int().min(1).max(5).nullable().optional(),
  objective1: z.string().max(500).nullable().optional(),
  objective2: z.string().max(500).nullable().optional(),
  objective3: z.string().max(500).nullable().optional(),
  mindDump: z.string().max(10000).nullable().optional(),
  evalNextWeekFocus: z.string().max(10000).nullable().optional(),
  evalPostponed: z.string().max(10000).nullable().optional(),
  evalToImprove: z.string().max(10000).nullable().optional(),
  evalDelegate: z.string().max(10000).nullable().optional(),
  evalNextWeekFocusProjectIds: z.array(z.string()).optional(),
  evalPostponedTaskIds: z.array(z.string()).optional(),
  evalDelegateTaskIds: z.array(z.string()).optional(),
  days: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        starRating: z.number().int().min(0).max(5).nullable().optional(),
        journalNote: z.string().max(2000).nullable().optional(),
        energy: z.number().int().min(1).max(5).nullable().optional(),
        dayGoal: z.string().max(500).nullable().optional(),
        firstTaskId: z.string().nullable().optional(),
        closeChecks: z.array(z.string()).optional(),
        closedAt: z.string().datetime().nullable().optional(),
      })
    )
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ iso: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { iso } = await params;
  const body = patchSchema.parse(await req.json());
  const { days, ...weekFields } = body;

  const week = await getOrCreateWeek(userId, iso);

  await prisma.week.update({ where: { id: week.id }, data: weekFields });

  if (days) {
    for (const { dayOfWeek, closedAt, firstTaskId, ...fields } of days) {
      const data: Record<string, unknown> = { ...fields };
      if (closedAt !== undefined) data.closedAt = closedAt ? new Date(closedAt) : null;
      if (firstTaskId !== undefined) {
        // Solo tareas propias del usuario: evita fijar como "primera tarea" un id ajeno adivinado.
        const owned = firstTaskId ? await prisma.task.findFirst({ where: { id: firstTaskId, userId }, select: { id: true } }) : null;
        data.firstTaskId = owned ? owned.id : null;
      }
      if (Object.keys(data).length === 0) continue;
      await prisma.day.updateMany({
        where: { weekId: week.id, dayOfWeek },
        data,
      });
    }
  }

  await logActivity(prisma, {
    userId,
    entityType: 'Week',
    entityId: week.id,
    action: 'UPDATED',
    summary: `Semana ${iso} actualizada`,
  });

  return NextResponse.json({ ok: true });
}

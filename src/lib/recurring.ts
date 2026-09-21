import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { weeksBetween } from '@/lib/week';
import type { RecurringTaskTemplate } from '@prisma/client';

function templateAppliesToWeek(template: RecurringTaskTemplate, isoWeek: string): boolean {
  const diff = weeksBetween(template.startIsoWeek, isoWeek);
  if (diff < 0) return false;
  if (template.recurrence === 'WEEKLY') return true;
  if (template.recurrence === 'BIWEEKLY') return diff % 2 === 0;
  if (template.recurrence === 'FOUR_WEEKLY') return diff % 4 === 0;
  return false;
}

/**
 * Devuelve la semana (creándola junto a sus 7 días si no existe) y
 * materializa en ella las tareas de las plantillas recurrentes que le
 * correspondan, evitando duplicar si ya se generaron antes.
 */
export async function getOrCreateWeek(userId: string, isoWeek: string) {
  let week = await prisma.week.findUnique({
    where: { userId_isoWeek: { userId, isoWeek } },
  });

  if (!week) {
    week = await prisma.week.create({
      data: {
        userId,
        isoWeek,
        days: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek })),
        },
      },
    });
    await logActivity(prisma, {
      userId,
      entityType: 'Week',
      entityId: week.id,
      action: 'CREATED',
      summary: `Semana ${isoWeek} creada`,
    });
  }

  await materializeRecurringTasks(userId, week.id, isoWeek);

  return week;
}

export async function materializeRecurringTasks(userId: string, weekId: string, isoWeek: string) {
  const templates = await prisma.recurringTaskTemplate.findMany({
    where: { userId, active: true },
  });

  const applicable = templates.filter((t) => templateAppliesToWeek(t, isoWeek));
  if (applicable.length === 0) return;

  const days = await prisma.day.findMany({ where: { weekId } });
  const dayByDow = new Map(days.map((d) => [d.dayOfWeek, d]));

  const existing = await prisma.task.findMany({
    where: { weekId, recurringTemplateId: { in: applicable.map((t) => t.id) } },
    select: { recurringTemplateId: true },
  });
  const existingIds = new Set(existing.map((t) => t.recurringTemplateId));

  const toCreate = applicable.filter((t) => !existingIds.has(t.id));
  if (toCreate.length === 0) return;

  for (const template of toCreate) {
    const day = dayByDow.get(template.dayOfWeek);
    if (!day) continue;
    const task = await prisma.task.create({
      data: {
        userId,
        weekId,
        dayId: day.id,
        kind: 'DAY_AREA',
        area: template.area,
        text: template.text,
        priority: template.priority,
        duration: template.duration,
        recurrence: template.recurrence,
        recurringTemplateId: template.id,
      },
    });
    await logActivity(prisma, {
      userId,
      entityType: 'Task',
      entityId: task.id,
      action: 'CREATED',
      summary: `Tarea recurrente generada: "${task.text}"`,
      metadata: { fromTemplate: template.id },
    });
  }
}

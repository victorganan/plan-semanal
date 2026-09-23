import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { dateForDayOfWeek, mondayBasedDayOfWeek } from '@/lib/week';
import { buildRRule } from '@/lib/rrule-helpers';
import type { RecurringTaskTemplate } from '@prisma/client';

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

function templateToRecurrenceValue(template: RecurringTaskTemplate) {
  return {
    freq: template.freq,
    interval: template.interval,
    byWeekdays: template.byWeekdays,
    monthlyByNthWeekday: template.monthlyByNthWeekday,
    endMode: template.endMode,
    endDate: template.endDate ? template.endDate.toISOString().slice(0, 10) : null,
    endCount: template.endCount,
  };
}

export async function materializeRecurringTasks(userId: string, weekId: string, isoWeek: string) {
  const templates = await prisma.recurringTaskTemplate.findMany({ where: { userId, active: true } });
  if (templates.length === 0) return;

  const weekStart = dateForDayOfWeek(isoWeek, 0);
  const weekEnd = dateForDayOfWeek(isoWeek, 6);

  // Para cada plantilla, qué días de esta semana (0=lunes..6=domingo) le corresponden.
  const dowsByTemplate = new Map<string, number[]>();
  for (const template of templates) {
    const rule = buildRRule(templateToRecurrenceValue(template), template.dtstart);
    const occurrences = rule.between(weekStart, weekEnd, true);
    if (occurrences.length > 0) {
      dowsByTemplate.set(
        template.id,
        occurrences.map((d) => mondayBasedDayOfWeek(d))
      );
    }
  }
  if (dowsByTemplate.size === 0) return;

  const days = await prisma.day.findMany({ where: { weekId } });
  const dayByDow = new Map(days.map((d) => [d.dayOfWeek, d]));

  const templateIds = Array.from(dowsByTemplate.keys());
  const existing = await prisma.task.findMany({
    where: { weekId, recurringTemplateId: { in: templateIds } },
    select: { recurringTemplateId: true, dayId: true },
  });
  const existingKeys = new Set(existing.map((t) => `${t.recurringTemplateId}:${t.dayId}`));

  const templateById = new Map(templates.map((t) => [t.id, t]));

  for (const [templateId, dows] of dowsByTemplate) {
    const template = templateById.get(templateId)!;
    for (const dow of dows) {
      const day = dayByDow.get(dow);
      if (!day || existingKeys.has(`${templateId}:${day.id}`)) continue;

      const task = await prisma.task.create({
        data: {
          userId,
          weekId,
          dayId: day.id,
          kind: 'DAY_AREA',
          areaId: template.areaId,
          text: template.text,
          priority: template.priority,
          durationMinutes: template.durationMinutes,
          recurrence: template.freq,
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
}

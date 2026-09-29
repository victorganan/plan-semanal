import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { dateForDayOfWeek } from '@/lib/week';
import { buildRRule } from '@/lib/rrule-helpers';
import type { RecurringTaskTemplate } from '@prisma/client';

// Endpoint temporal de diagnóstico (solo lectura, no borra nada, alcance
// solo a las tareas del usuario que llama): cuenta, para cada plantilla
// recurrente y cada semana en la que tiene tareas, cuántas hay realmente
// frente a las que su patrón de repetición esperaba generar esa semana.
// Un exceso es la huella del bug corregido en materializeRecurringTasks
// (src/lib/recurring.ts): comprobaba si ya existía tarea por día "de
// origen", así que mover una tarea recurrente a otro día (p.ej. al
// posponerla en el Cierre) dejaba su hueco original libre para que la
// siguiente carga de esa semana lo rellenara de nuevo, duplicándola.
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

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const templates = await prisma.recurringTaskTemplate.findMany({ where: { userId } });
  if (templates.length === 0) {
    return NextResponse.json({ totalSuspectedDuplicateTasks: 0, suspectedDuplicateGroups: [] });
  }

  const templateIds = templates.map((t) => t.id);
  const tasks = await prisma.task.findMany({
    where: { userId, recurringTemplateId: { in: templateIds } },
    select: { id: true, text: true, recurringTemplateId: true, weekId: true, dayId: true, done: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const weekIds = Array.from(new Set(tasks.map((t) => t.weekId).filter((id): id is string => !!id)));
  const weeks = await prisma.week.findMany({ where: { id: { in: weekIds } }, select: { id: true, isoWeek: true } });
  const isoWeekByWeekId = new Map(weeks.map((w) => [w.id, w.isoWeek]));
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const groups = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.weekId || !task.recurringTemplateId) continue;
    const key = `${task.recurringTemplateId}:${task.weekId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  const suspectedDuplicateGroups: Array<{
    templateId: string;
    templateText: string;
    isoWeek: string;
    expectedCount: number;
    actualCount: number;
    suspectedExtra: number;
    tasks: { id: string; text: string; dayId: string | null; done: boolean; createdAt: Date }[];
  }> = [];
  let totalSuspectedDuplicateTasks = 0;

  for (const [key, groupTasks] of groups) {
    const [templateId, weekId] = key.split(':');
    const isoWeek = isoWeekByWeekId.get(weekId);
    const template = templateById.get(templateId);
    if (!isoWeek || !template) continue;

    const weekStart = dateForDayOfWeek(isoWeek, 0);
    const weekEnd = dateForDayOfWeek(isoWeek, 6);
    const rule = buildRRule(templateToRecurrenceValue(template), template.dtstart);
    const expectedCount = rule.between(weekStart, weekEnd, true).length;

    if (groupTasks.length > expectedCount) {
      const extra = groupTasks.length - expectedCount;
      totalSuspectedDuplicateTasks += extra;
      suspectedDuplicateGroups.push({
        templateId,
        templateText: template.text,
        isoWeek,
        expectedCount,
        actualCount: groupTasks.length,
        suspectedExtra: extra,
        tasks: groupTasks.map((t) => ({ id: t.id, text: t.text, dayId: t.dayId, done: t.done, createdAt: t.createdAt })),
      });
    }
  }

  return NextResponse.json({
    hint: 'Solo diagnóstico: no borra nada. Un grupo con actualCount > expectedCount es una plantilla+semana con más tareas de las que su patrón de repetición esperaba generar esa semana.',
    totalSuspectedDuplicateTasks,
    suspectedDuplicateGroups,
  });
}

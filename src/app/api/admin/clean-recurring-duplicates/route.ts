import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { logActivity } from '@/lib/audit';
import { dateForDayOfWeek } from '@/lib/week';
import { buildRRule } from '@/lib/rrule-helpers';
import { selectDuplicatesToDelete } from '@/lib/recurring-cleanup';
import type { RecurringTaskTemplate, Task } from '@prisma/client';

// Endpoint temporal de limpieza de los duplicados creados por el bug de
// materializeRecurringTasks (ver src/lib/recurring.ts y
// /api/admin/find-recurring-duplicates). Alcance fijo, a propósito, para
// esta limpieza puntual: solo las plantillas de este allowlist. La decisión
// de qué tarea conservar y cuál borrar vive en src/lib/recurring-cleanup.ts
// (con sus propios tests): nunca borra una tarea completada.
//
// Solo lectura por defecto (dry-run): calcula qué se borraría y guarda una
// copia de seguridad completa en ActivityLog (entityType 'Task', action
// 'UPDATED', metadata con las filas exactas) ANTES de borrar nada. Repetir
// la llamada con ?apply=true&confirm=SI vuelve a calcular en el momento
// (por si algo cambió) y borra de verdad, dejando también su propia copia
// de seguridad y un registro DELETED por tarea borrada — igual que hace
// el resto de la app al borrar una tarea a mano.
const TEMPLATE_TEXT_ALLOWLIST = ['Planificación próxima semana', 'Gestión comercial de empresas'];

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

type Group = { templateId: string; templateText: string; isoWeek: string; expectedCount: number; tasks: Task[] };

async function computeGroups(userId: string): Promise<Group[]> {
  const templates = await prisma.recurringTaskTemplate.findMany({
    where: { userId, text: { in: TEMPLATE_TEXT_ALLOWLIST } },
  });
  if (templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);
  const tasks = await prisma.task.findMany({
    where: { userId, recurringTemplateId: { in: templateIds } },
    orderBy: { createdAt: 'asc' },
  });

  const weekIds = Array.from(new Set(tasks.map((t) => t.weekId).filter((id): id is string => !!id)));
  const weeks = await prisma.week.findMany({ where: { id: { in: weekIds } }, select: { id: true, isoWeek: true } });
  const isoWeekByWeekId = new Map(weeks.map((w) => [w.id, w.isoWeek]));
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const grouped = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.weekId || !task.recurringTemplateId) continue;
    const key = `${task.recurringTemplateId}:${task.weekId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  const groups: Group[] = [];
  for (const [key, groupTasks] of grouped) {
    const [templateId, weekId] = key.split(':');
    const isoWeek = isoWeekByWeekId.get(weekId);
    const template = templateById.get(templateId);
    if (!isoWeek || !template) continue;

    const weekStart = dateForDayOfWeek(isoWeek, 0);
    const weekEnd = dateForDayOfWeek(isoWeek, 6);
    const rule = buildRRule(templateToRecurrenceValue(template), template.dtstart);
    const expectedCount = rule.between(weekStart, weekEnd, true).length;

    groups.push({ templateId, templateText: template.text, isoWeek, expectedCount, tasks: groupTasks });
  }

  return groups;
}

function buildPlan(groups: Group[]) {
  const toDeleteByGroup: { group: Group; keepId: string | null; deleteTasks: Task[] }[] = [];
  const skippedGroups: { templateText: string; isoWeek: string; reason: string }[] = [];

  for (const group of groups) {
    const decision = selectDuplicatesToDelete(
      group.tasks.map((t) => ({ id: t.id, done: t.done })),
      group.expectedCount
    );
    if (decision.skippedReason) {
      skippedGroups.push({ templateText: group.templateText, isoWeek: group.isoWeek, reason: decision.skippedReason });
      continue;
    }
    if (decision.deleteIds.length === 0) continue;
    const deleteTasks = group.tasks.filter((t) => decision.deleteIds.includes(t.id));
    toDeleteByGroup.push({ group, keepId: decision.keepId, deleteTasks });
  }

  const summary = {
    totalToDelete: toDeleteByGroup.reduce((n, g) => n + g.deleteTasks.length, 0),
    groups: toDeleteByGroup.map(({ group, keepId, deleteTasks }) => ({
      templateText: group.templateText,
      isoWeek: group.isoWeek,
      expectedCount: group.expectedCount,
      keep: (() => {
        const k = group.tasks.find((t) => t.id === keepId);
        return k ? { id: k.id, text: k.text, dayId: k.dayId, done: k.done, createdAt: k.createdAt } : null;
      })(),
      toDelete: deleteTasks.map((t) => ({ id: t.id, text: t.text, dayId: t.dayId, done: t.done, createdAt: t.createdAt })),
    })),
    skippedGroups,
  };

  return { toDeleteByGroup, summary };
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const apply = req.nextUrl.searchParams.get('apply') === 'true';
  const confirm = req.nextUrl.searchParams.get('confirm') === 'SI';

  const groups = await computeGroups(userId);
  const { toDeleteByGroup, summary } = buildPlan(groups);

  if (!apply) {
    if (summary.totalToDelete > 0) {
      await logActivity(prisma, {
        userId,
        entityType: 'Task',
        entityId: 'clean-recurring-duplicates',
        action: 'UPDATED',
        summary: `Copia de seguridad previa a limpiar ${summary.totalToDelete} tarea(s) duplicada(s) por el bug de tareas recurrentes`,
        metadata: summary,
      });
    }
    return NextResponse.json({
      dryRun: true,
      hint:
        summary.totalToDelete > 0
          ? 'No se ha borrado nada. Copia de seguridad guardada en el registro de actividad. Repite esta misma URL añadiendo &apply=true&confirm=SI para borrar de verdad.'
          : 'No hay nada que borrar con los criterios actuales.',
      ...summary,
    });
  }

  if (!confirm) {
    return NextResponse.json(
      { error: 'Falta confirmación explícita: repite la llamada añadiendo &confirm=SI para borrar de verdad.' },
      { status: 400 }
    );
  }

  if (summary.totalToDelete === 0) {
    return NextResponse.json({ applied: true, deletedCount: 0, hint: 'No había nada que borrar.' });
  }

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: 'clean-recurring-duplicates',
    action: 'UPDATED',
    summary: `Copia de seguridad final antes de borrar ${summary.totalToDelete} tarea(s) duplicada(s) por el bug de tareas recurrentes`,
    metadata: summary,
  });

  const deleted: { id: string; text: string }[] = [];
  for (const { group, keepId, deleteTasks } of toDeleteByGroup) {
    for (const task of deleteTasks) {
      await prisma.task.delete({ where: { id: task.id } });
      await logActivity(prisma, {
        userId,
        entityType: 'Task',
        entityId: task.id,
        action: 'DELETED',
        summary: `Duplicado por bug de tareas recurrentes eliminado: "${task.text}"`,
        metadata: { keptTaskId: keepId, templateText: group.templateText, isoWeek: group.isoWeek },
      });
      deleted.push({ id: task.id, text: task.text });
    }
  }

  return NextResponse.json({ applied: true, deletedCount: deleted.length, deleted, skippedGroups: summary.skippedGroups });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { logActivity } from '@/lib/audit';
import { getOrCreateWeek } from '@/lib/recurring';
import { isoWeekOf, mondayBasedDayOfWeek } from '@/lib/week';

// Endpoint temporal, protegido por login y limitado al usuario que llama.
// Corrige tareas de Bandeja completadas con la regla de los 2 minutos
// ("Hazlo ya") que se quedaron sueltas en BACKLOG (sin semana/día) en vez
// de contar como hechas el día real en que se hicieron. Se excluyen
// miniproyectos (tienen subtareas propias) y subtareas (pertenecen a un
// miniproyecto, no a este flujo).
//
// Sin ?apply=true: dry-run de solo lectura, lista lo que cambiaría.
// Con ?apply=true&confirm=SI: aplica los cambios y deja rastro en
// ActivityLog. `updatedAt` se preserva tal cual estaba (es el instante real
// de completado que hay que conservar), no se toca con la corrección.
// Retirar este endpoint una vez confirmado el resultado en producción.
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const apply = req.nextUrl.searchParams.get('apply') === 'true';
  const confirm = req.nextUrl.searchParams.get('confirm');

  const candidates = await prisma.task.findMany({
    where: {
      userId,
      kind: 'BACKLOG',
      done: true,
      parentTaskId: null,
      subtasks: { none: {} },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const areas = await prisma.area.findMany({ where: { userId }, orderBy: { order: 'asc' } });
  const defaultAreaId = areas[0]?.id ?? null;

  const plan = candidates.map((task) => ({
    task,
    isoWeek: isoWeekOf(task.updatedAt),
    dayOfWeek: mondayBasedDayOfWeek(task.updatedAt),
  }));

  if (!apply) {
    return NextResponse.json({
      dryRun: true,
      count: plan.length,
      noAreasWarning:
        defaultAreaId === null
          ? 'No tienes ninguna Área creada: estas tareas no se podrán agrupar en el día hasta que crees una en Tu espacio.'
          : undefined,
      tasks: plan.map(({ task, isoWeek, dayOfWeek }) => ({
        id: task.id,
        text: task.text,
        completedAt: task.updatedAt,
        targetIsoWeek: isoWeek,
        targetDayOfWeek: dayOfWeek,
      })),
    });
  }

  if (confirm !== 'SI') {
    return NextResponse.json({ error: 'Falta ?confirm=SI para aplicar los cambios' }, { status: 400 });
  }

  const appliedIds: string[] = [];
  for (const { task, isoWeek, dayOfWeek } of plan) {
    const week = await getOrCreateWeek(userId, isoWeek);
    const day = await prisma.day.findUnique({ where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek } } });
    if (!day) continue;

    await logActivity(prisma, {
      userId,
      entityType: 'Task',
      entityId: task.id,
      action: 'UPDATED',
      summary: `Corrección: "${task.text}" reasignada al día real en que se completó (${isoWeek}, día ${dayOfWeek})`,
      metadata: {
        before: { kind: task.kind, weekId: task.weekId, dayId: task.dayId, areaId: task.areaId },
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: {
        kind: 'DAY_AREA',
        weekId: week.id,
        dayId: day.id,
        areaId: task.areaId ?? defaultAreaId,
        updatedAt: task.updatedAt,
      },
    });
    appliedIds.push(task.id);
  }

  return NextResponse.json({ applied: true, count: appliedIds.length, ids: appliedIds });
}

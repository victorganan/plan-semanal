import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getValidGoogleAccessToken, createCalendarEvent, updateCalendarEvent } from '@/lib/google-calendar';
import { getOrCreateWeek } from '@/lib/recurring';
import { isoWeekOf, mondayBasedDayOfWeek } from '@/lib/week';

const schema = z.object({ taskId: z.string() });

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { taskId } = schema.parse(await req.json());
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task || task.userId !== userId) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  if (!task.scheduledAt) {
    return NextResponse.json({ error: 'La tarea no tiene fecha y hora asignada' }, { status: 400 });
  }

  const accessToken = await getValidGoogleAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json({ error: 'Sin acceso a Google Calendar. Vuelve a iniciar sesión concediendo el permiso.' }, { status: 400 });
  }

  const eventParams = {
    summary: task.text,
    description: task.project ? `Proyecto: ${task.project.name}` : undefined,
    startISO: task.scheduledAt.toISOString(),
    durationMinutes: task.durationMinutes ?? 30,
  };

  // Si ya tiene un evento reservado, se actualiza en el sitio en vez de
  // duplicarlo. El evento pudo borrarse por fuera de Nortvira (Calendar
  // devuelve 404/410): en ese caso updateCalendarEvent devuelve null y se
  // crea uno nuevo, igual que si nunca hubiera tenido.
  const event =
    (task.calendarEventId ? await updateCalendarEvent(accessToken, task.calendarEventId, eventParams) : null) ??
    (await createCalendarEvent(accessToken, eventParams));

  // Reservar tiempo también mueve la tarea a ese día y hora en Nortvira.
  const isoWeek = isoWeekOf(task.scheduledAt);
  const dayOfWeek = mondayBasedDayOfWeek(task.scheduledAt);
  const week = await getOrCreateWeek(userId, isoWeek);
  const day = await prisma.day.findUnique({ where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek } } });
  const areaId = task.areaId ?? (await prisma.area.findFirst({ where: { userId }, orderBy: { order: 'asc' } }))?.id ?? null;

  await prisma.task.update({
    where: { id: task.id },
    data: {
      calendarEventId: event.id,
      ...(day ? { kind: 'DAY_AREA', weekId: week.id, dayId: day.id, areaId } : {}),
    },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: task.id,
    action: 'UPDATED',
    summary: task.calendarEventId
      ? `Evento de Google Calendar actualizado para: "${task.text}"`
      : `Evento creado en Google Calendar para: "${task.text}"`,
    metadata: { calendarEventId: event.id },
  });

  return NextResponse.json({ ok: true, event });
}

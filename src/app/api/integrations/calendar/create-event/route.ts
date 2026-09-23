import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getValidGoogleAccessToken, createCalendarEvent } from '@/lib/google-calendar';

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

  const event = await createCalendarEvent(accessToken, {
    summary: task.text,
    description: task.project ? `Proyecto: ${task.project.name}` : undefined,
    startISO: task.scheduledAt.toISOString(),
    durationMinutes: task.durationMinutes ?? 30,
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: task.id,
    action: 'UPDATED',
    summary: `Evento creado en Google Calendar para: "${task.text}"`,
    metadata: { calendarEventId: event.id },
  });

  return NextResponse.json({ ok: true, event });
}

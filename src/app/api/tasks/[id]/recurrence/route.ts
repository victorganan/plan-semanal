import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { dateForDayOfWeek } from '@/lib/week';

const recurrenceValueSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.number().int().min(1).max(99),
  byWeekdays: z.array(z.number().int().min(0).max(6)),
  monthlyByNthWeekday: z.boolean(),
  endMode: z.enum(['NEVER', 'ON_DATE', 'AFTER_COUNT']),
  endDate: z.string().nullable(),
  endCount: z.number().int().min(1).nullable(),
});

const patchSchema = z.object({ value: recurrenceValueSchema.nullable() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { week: true, day: true, recurringTemplate: true },
  });
  if (!task || task.userId !== userId) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const { value } = patchSchema.parse(await req.json());

  if (value === null) {
    if (task.recurringTemplateId) {
      await prisma.recurringTaskTemplate.update({ where: { id: task.recurringTemplateId }, data: { active: false } });
    }
    const updated = await prisma.task.update({
      where: { id },
      data: { recurringTemplateId: null, recurrence: 'NONE' },
    });
    await logActivity(prisma, {
      userId,
      entityType: 'Task',
      entityId: id,
      action: 'UPDATED',
      summary: `Recurrencia desactivada: "${task.text}"`,
    });
    return NextResponse.json(updated);
  }

  if (task.kind !== 'DAY_AREA' || !task.day || !task.week || !task.areaId) {
    return NextResponse.json({ error: 'Solo las tareas de día pueden repetirse' }, { status: 400 });
  }

  const templateData = {
    freq: value.freq,
    interval: value.interval,
    byWeekdays: value.byWeekdays,
    monthlyByNthWeekday: value.monthlyByNthWeekday,
    endMode: value.endMode,
    endDate: value.endDate ? new Date(`${value.endDate}T23:59:59Z`) : null,
    endCount: value.endCount,
  };

  let templateId = task.recurringTemplateId;
  if (task.recurringTemplate) {
    await prisma.recurringTaskTemplate.update({
      where: { id: task.recurringTemplate.id },
      data: { ...templateData, active: true },
    });
  } else {
    const dtstart = dateForDayOfWeek(task.week.isoWeek, task.day.dayOfWeek);
    const template = await prisma.recurringTaskTemplate.create({
      data: {
        userId,
        areaId: task.areaId,
        text: task.text,
        priority: task.priority,
        durationMinutes: task.durationMinutes,
        dtstart,
        ...templateData,
      },
    });
    templateId = template.id;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: { recurringTemplateId: templateId, recurrence: value.freq },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: id,
    action: 'UPDATED',
    summary: `Recurrencia configurada: "${task.text}"`,
  });

  return NextResponse.json(updated);
}

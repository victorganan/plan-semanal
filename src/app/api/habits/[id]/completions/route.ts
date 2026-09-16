import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';

const schema = z.object({
  isoWeek: z.string().regex(/^\d{4}-W\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(4), // L-V
  done: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { isoWeek, dayOfWeek, done } = schema.parse(await req.json());
  const week = await getOrCreateWeek(userId, isoWeek);

  const completion = await prisma.habitCompletion.upsert({
    where: { habitId_weekId_dayOfWeek: { habitId: habit.id, weekId: week.id, dayOfWeek } },
    create: { habitId: habit.id, weekId: week.id, dayOfWeek, done },
    update: { done },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'HabitCompletion',
    entityId: completion.id,
    action: done ? 'COMPLETED' : 'UNCOMPLETED',
    summary: `Hábito "${habit.name}" ${done ? 'marcado' : 'desmarcado'} (${isoWeek}, día ${dayOfWeek})`,
  });

  return NextResponse.json(completion);
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(habits);
}

const createSchema = z.object({ name: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { name } = createSchema.parse(await req.json());
  const maxOrder = await prisma.habit.aggregate({ where: { userId }, _max: { order: true } });

  const habit = await prisma.habit.create({
    data: { userId, name, order: (maxOrder._max.order ?? -1) + 1 },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Habit',
    entityId: habit.id,
    action: 'CREATED',
    summary: `Hábito creado: "${habit.name}"`,
  });

  return NextResponse.json(habit, { status: 201 });
}

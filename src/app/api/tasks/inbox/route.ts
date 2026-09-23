import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const tasks = await prisma.task.findMany({
    where: { userId, kind: 'BACKLOG' },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { project: { include: { area: true } }, area: true, subtasks: true },
  });

  return NextResponse.json(tasks);
}

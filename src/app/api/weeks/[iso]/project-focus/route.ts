import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';

const schema = z.object({ projectId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ iso: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { iso } = await params;
  const { projectId } = schema.parse(await req.json());
  const week = await getOrCreateWeek(userId, iso);

  await prisma.weekProjectFocus.upsert({
    where: { weekId_projectId: { weekId: week.id, projectId } },
    create: { weekId: week.id, projectId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ iso: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { iso } = await params;
  const { projectId } = schema.parse(await req.json());
  const week = await getOrCreateWeek(userId, iso);

  await prisma.weekProjectFocus.deleteMany({ where: { weekId: week.id, projectId } });

  return NextResponse.json({ ok: true });
}

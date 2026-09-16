import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = patchSchema.parse(await req.json());
  const updated = await prisma.habit.update({ where: { id }, data: body });

  await logActivity(prisma, {
    userId,
    entityType: 'Habit',
    entityId: habit.id,
    action: 'UPDATED',
    summary: `Hábito actualizado: "${updated.name}"`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.habit.delete({ where: { id } });

  await logActivity(prisma, {
    userId,
    entityType: 'Habit',
    entityId: id,
    action: 'DELETED',
    summary: `Hábito eliminado: "${habit.name}"`,
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { durationMinutesSchema } from '@/lib/validation';

const patchSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  areaId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  durationMinutes: durationMinutesSchema,
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const template = await prisma.recurringTaskTemplate.findUnique({ where: { id } });
  if (!template || template.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = patchSchema.parse(await req.json());
  const updated = await prisma.recurringTaskTemplate.update({ where: { id }, data: body });

  await logActivity(prisma, {
    userId,
    entityType: 'RecurringTaskTemplate',
    entityId: template.id,
    action: 'UPDATED',
    summary: `Plantilla recurrente actualizada: "${updated.text}"`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const template = await prisma.recurringTaskTemplate.findUnique({ where: { id } });
  if (!template || template.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.recurringTaskTemplate.delete({ where: { id } });

  await logActivity(prisma, {
    userId,
    entityType: 'RecurringTaskTemplate',
    entityId: id,
    action: 'DELETED',
    summary: `Plantilla recurrente eliminada: "${template.text}"`,
  });

  return NextResponse.json({ ok: true });
}

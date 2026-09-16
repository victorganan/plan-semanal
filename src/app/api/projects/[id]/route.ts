import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  area: z.enum(['SERVILIA', 'GESTIONA', 'PERSONAL']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = patchSchema.parse(await req.json());
  const updated = await prisma.project.update({ where: { id }, data: body });

  await logActivity(prisma, {
    userId,
    entityType: 'Project',
    entityId: project.id,
    action: 'UPDATED',
    summary: `Proyecto actualizado: "${updated.name}"`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.project.delete({ where: { id } });

  await logActivity(prisma, {
    userId,
    entityType: 'Project',
    entityId: id,
    action: 'DELETED',
    summary: `Proyecto eliminado: "${project.name}"`,
  });

  return NextResponse.json({ ok: true });
}

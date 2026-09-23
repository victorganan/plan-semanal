import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  areaId: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  collaboratorNames: z.array(z.string().min(1).max(100)).max(30).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = patchSchema.parse(await req.json());
  const { collaboratorNames, dueDate, ...rest } = body;

  const updated = await prisma.$transaction(async (tx) => {
    if (collaboratorNames !== undefined) {
      await tx.projectCollaborator.deleteMany({ where: { projectId: id } });
      if (collaboratorNames.length) {
        await tx.projectCollaborator.createMany({
          data: Array.from(new Set(collaboratorNames)).map((name) => ({ projectId: id, name })),
        });
      }
    }
    return tx.project.update({
      where: { id },
      data: { ...rest, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}) },
      include: { area: true, collaborators: true },
    });
  });

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

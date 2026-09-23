import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { AREA_PALETTE_SIZE } from '@/types';

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
  colorIndex: z.number().int().min(0).max(AREA_PALETTE_SIZE - 1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const area = await prisma.area.findUnique({ where: { id } });
  if (!area || area.userId !== userId) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const body = patchSchema.parse(await req.json());
  const updated = await prisma.area.update({ where: { id }, data: body }).catch(() => null);
  if (!updated) return NextResponse.json({ error: 'Ya tienes un área con ese nombre' }, { status: 409 });

  await logActivity(prisma, {
    userId,
    entityType: 'Area',
    entityId: area.id,
    action: 'UPDATED',
    summary: `Área actualizada: "${updated.name}"`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const area = await prisma.area.findUnique({ where: { id } });
  if (!area || area.userId !== userId) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const [blockingProjects, blockingTemplates] = await Promise.all([
    prisma.project.findMany({ where: { areaId: id }, select: { id: true, name: true } }),
    prisma.recurringTaskTemplate.findMany({ where: { areaId: id }, select: { id: true, text: true } }),
  ]);

  if (blockingProjects.length > 0 || blockingTemplates.length > 0) {
    const parts: string[] = [];
    if (blockingProjects.length > 0) parts.push(`${blockingProjects.length} proyecto${blockingProjects.length === 1 ? '' : 's'}`);
    if (blockingTemplates.length > 0)
      parts.push(`${blockingTemplates.length} plantilla${blockingTemplates.length === 1 ? '' : 's'} recurrente${blockingTemplates.length === 1 ? '' : 's'}`);
    return NextResponse.json(
      {
        error: `No se puede eliminar: todavía tiene ${parts.join(' y ')} asignados. Muévelos a otra área primero.`,
        blockers: {
          projects: blockingProjects,
          templates: blockingTemplates.map((t) => ({ id: t.id, name: t.text })),
        },
      },
      { status: 409 }
    );
  }

  // Las tareas sueltas sin proyecto se quedan sin área (SetNull) en vez de bloquear el borrado.
  await prisma.area.delete({ where: { id } });

  await logActivity(prisma, {
    userId,
    entityType: 'Area',
    entityId: id,
    action: 'DELETED',
    summary: `Área eliminada: "${area.name}"`,
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
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

  const [projectCount, templateCount] = await Promise.all([
    prisma.project.count({ where: { areaId: id } }),
    prisma.recurringTaskTemplate.count({ where: { areaId: id } }),
  ]);

  if (projectCount > 0 || templateCount > 0) {
    const parts: string[] = [];
    if (projectCount > 0) parts.push(`${projectCount} proyecto${projectCount === 1 ? '' : 's'}`);
    if (templateCount > 0) parts.push(`${templateCount} plantilla${templateCount === 1 ? '' : 's'} recurrente${templateCount === 1 ? '' : 's'}`);
    return NextResponse.json(
      { error: `No se puede eliminar: todavía tiene ${parts.join(' y ')} asignados. Muévelos a otra área primero.` },
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

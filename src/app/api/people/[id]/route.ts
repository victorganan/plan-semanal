import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { personInclude, personSchema } from '@/lib/people';

const patchSchema = personSchema.partial();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person || person.userId !== userId) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Revisa el nombre y el email' }, { status: 400 });
  const body = parsed.data;

  const renamed = body.name !== undefined && body.name !== person.name;
  if (renamed) {
    const clash = await prisma.person.findFirst({
      where: { userId, id: { not: id }, name: { equals: body.name, mode: 'insensitive' } },
    });
    if (clash) return NextResponse.json({ error: `Ya tienes a "${clash.name}" en Personas` }, { status: 409 });
  }

  const areaIds = body.areaIds
    ? (await prisma.area.findMany({ where: { userId, id: { in: body.areaIds } }, select: { id: true } })).map((a) => a.id)
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.person.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(areaIds ? { areas: { set: areaIds.map((a) => ({ id: a })) } } : {}),
      },
      include: personInclude,
    });
    // Las tareas guardan el nombre en texto: al renombrar, se arrastra.
    if (renamed) {
      await tx.task.updateMany({ where: { userId, assignedTo: person.name }, data: { assignedTo: p.name } });
      await tx.task.updateMany({ where: { userId, waitingOn: person.name }, data: { waitingOn: p.name } });
    }
    return p;
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Person',
    entityId: id,
    action: 'UPDATED',
    summary: `Persona actualizada: "${updated.name}"`,
  });

  return NextResponse.json(updated);
}

// Borrar a una persona no toca sus tareas: siguen mostrando su nombre.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person || person.userId !== userId) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  await prisma.person.delete({ where: { id } });

  await logActivity(prisma, {
    userId,
    entityType: 'Person',
    entityId: id,
    action: 'DELETED',
    summary: `Persona eliminada: "${person.name}"`,
  });

  return NextResponse.json({ ok: true });
}

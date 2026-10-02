import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { personInclude, personSchema } from '@/lib/people';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const people = await prisma.person.findMany({ where: { userId }, include: personInclude, orderBy: { name: 'asc' } });
  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const parsed = personSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Revisa el nombre y el email' }, { status: 400 });
  const body = parsed.data;

  // Sin duplicados: el mismo nombre con otras mayúsculas es la misma persona.
  const existing = await prisma.person.findFirst({ where: { userId, name: { equals: body.name, mode: 'insensitive' } } });
  if (existing) return NextResponse.json({ error: `Ya tienes a "${existing.name}" en Personas` }, { status: 409 });

  const areaIds = body.areaIds?.length
    ? (await prisma.area.findMany({ where: { userId, id: { in: body.areaIds } }, select: { id: true } })).map((a) => a.id)
    : [];

  const person = await prisma.person.create({
    data: { userId, name: body.name, email: body.email ?? null, areas: { connect: areaIds.map((id) => ({ id })) } },
    include: personInclude,
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Person',
    entityId: person.id,
    action: 'CREATED',
    summary: `Persona añadida: "${person.name}"`,
  });

  return NextResponse.json(person, { status: 201 });
}

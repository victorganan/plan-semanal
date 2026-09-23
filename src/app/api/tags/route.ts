import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  return NextResponse.json(tags);
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  colorIndex: z.number().int().min(0).max(7).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());

  // Idempotente: si el usuario ya tiene una etiqueta con ese nombre, la reutiliza
  // en vez de fallar por la restricción de unicidad (facilita "escribir y listo").
  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId, name: body.name } },
    create: { userId, name: body.name, colorIndex: body.colorIndex ?? 0 },
    update: {},
  });

  return NextResponse.json(tag, { status: 201 });
}

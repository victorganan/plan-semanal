import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';

const schema = z.object({
  dailyCapacityMinutes: z.number().int().min(15).max(1440).optional(),
  bufferPercent: z.number().int().min(0).max(40).optional(),
});

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = schema.parse(await req.json());

  await prisma.user.update({ where: { id: userId }, data: body });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { endpoint, keys } = schema.parse(await req.json());

  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId, endpoint } },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ endpoint: z.string().url() });

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { endpoint } = deleteSchema.parse(await req.json());
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });

  return NextResponse.json({ ok: true });
}

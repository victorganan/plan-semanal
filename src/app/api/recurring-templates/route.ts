import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { durationMinutesSchema } from '@/lib/validation';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const templates = await prisma.recurringTaskTemplate.findMany({
    where: { userId, active: true },
    include: { area: true },
    orderBy: [{ dtstart: 'asc' }],
  });
  return NextResponse.json(templates);
}

const createSchema = z.object({
  areaId: z.string(),
  text: z.string().min(1).max(500),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  durationMinutes: durationMinutesSchema,
  dtstart: z.string(), // yyyy-mm-dd
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.number().int().min(1).max(99),
  byWeekdays: z.array(z.number().int().min(0).max(6)),
  monthlyByNthWeekday: z.boolean(),
  endMode: z.enum(['NEVER', 'ON_DATE', 'AFTER_COUNT']),
  endDate: z.string().nullable(),
  endCount: z.number().int().min(1).nullable(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());
  const { dtstart, endDate, ...rest } = body;

  const template = await prisma.recurringTaskTemplate.create({
    data: {
      userId,
      ...rest,
      dtstart: new Date(`${dtstart}T00:00:00Z`),
      endDate: endDate ? new Date(`${endDate}T23:59:59Z`) : null,
    },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'RecurringTaskTemplate',
    entityId: template.id,
    action: 'CREATED',
    summary: `Plantilla recurrente creada: "${template.text}"`,
  });

  return NextResponse.json(template, { status: 201 });
}

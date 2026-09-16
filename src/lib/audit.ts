import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type ActivityAction = 'CREATED' | 'UPDATED' | 'COMPLETED' | 'UNCOMPLETED' | 'DELETED';

export async function logActivity(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    userId: string;
    entityType: string;
    entityId: string;
    action: ActivityAction;
    summary: string;
    metadata?: Record<string, unknown>;
  }
) {
  await tx.activityLog.create({
    data: {
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      summary: params.summary,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

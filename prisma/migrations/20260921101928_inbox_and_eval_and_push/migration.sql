-- AlterEnum
ALTER TYPE "TaskKind" ADD VALUE 'BACKLOG';

-- AlterTable: userId se añade nullable, se rellena desde Week y luego se hace NOT NULL,
-- para no romper si la tabla Task ya tiene filas en producción.
ALTER TABLE "Task" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "weekId" DROP NOT NULL;

UPDATE "Task" t
SET "userId" = w."userId"
FROM "Week" w
WHERE t."weekId" = w."id" AND t."userId" IS NULL;

ALTER TABLE "Task" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weeklyReminderDayOfWeek" INTEGER,
ADD COLUMN     "weeklyReminderTime" TEXT;

-- AlterTable
ALTER TABLE "Week" ADD COLUMN     "evalDelegateTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "evalNextWeekFocusProjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "evalPostponedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "GtdStatus" AS ENUM ('ACTIVA', 'ESPERANDO', 'ALGUN_DIA');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "context" TEXT,
ADD COLUMN     "firstStep" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "gtdStatus" "GtdStatus" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "isPriority" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "snoozeUntil" TIMESTAMP(3),
ADD COLUMN     "waitingOn" TEXT;

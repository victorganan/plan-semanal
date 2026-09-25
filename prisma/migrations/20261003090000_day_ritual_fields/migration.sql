-- CreateEnum
CREATE TYPE "ArranqueVisibility" AS ENUM ('LABORABLES', 'SIEMPRE', 'NUNCA');

-- AlterTable
ALTER TABLE "Day" ADD COLUMN     "closeChecks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "dayGoal" TEXT,
ADD COLUMN     "energy" INTEGER,
ADD COLUMN     "firstTaskId" TEXT,
ADD COLUMN     "overloadAccepted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "arranqueVisibility" "ArranqueVisibility" NOT NULL DEFAULT 'LABORABLES';

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_firstTaskId_fkey" FOREIGN KEY ("firstTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;


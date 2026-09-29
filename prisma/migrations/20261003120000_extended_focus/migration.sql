-- AlterTable
ALTER TABLE "Day" ADD COLUMN     "avoidToday" TEXT,
ADD COLUMN     "desiredFeeling" TEXT,
ADD COLUMN     "gratitude" TEXT,
ADD COLUMN     "inspiration" TEXT,
ADD COLUMN     "learning" TEXT,
ADD COLUMN     "yesterdayReview" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "extendedFocusEnabled" BOOLEAN NOT NULL DEFAULT false;


-- AlterTable
ALTER TABLE "DemoSet" ADD COLUMN     "closedDate" TIMESTAMP(3),
ADD COLUMN     "completedDate" TIMESTAMP(3),
ADD COLUMN     "dealRevenue" DOUBLE PRECISION,
ADD COLUMN     "shownDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SET';

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'BDR',
    "quota" INTEGER NOT NULL DEFAULT 8,
    "tier" TEXT NOT NULL DEFAULT 'BDR1',
    "workingDays" INTEGER,
    "commissionModel" TEXT NOT NULL DEFAULT 'percent',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "flatBonus" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

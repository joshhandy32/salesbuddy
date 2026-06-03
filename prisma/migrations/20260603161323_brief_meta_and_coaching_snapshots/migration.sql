-- AlterTable
ALTER TABLE "Brief" ADD COLUMN     "aeName" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "dealSize" TEXT,
ADD COLUMN     "industry" TEXT;

-- CreateTable
CREATE TABLE "CoachingSnapshot" (
    "repName" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachingSnapshot_pkey" PRIMARY KEY ("repName")
);

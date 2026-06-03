-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "repName" TEXT,
    "email" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "rating" INTEGER,
    "feedbackNote" TEXT,
    "corrected" TEXT,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "quota" INTEGER NOT NULL DEFAULT 8,
    "commissionModel" TEXT NOT NULL DEFAULT 'percent',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "flatBonus" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacingMonth" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "shows" INTEGER NOT NULL,
    "completes" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,

    CONSTRAINT "PacingMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Brief_repName_createdAt_idx" ON "Brief"("repName", "createdAt");

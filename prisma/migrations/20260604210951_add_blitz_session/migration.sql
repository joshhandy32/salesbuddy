-- CreateTable
CREATE TABLE "BlitzSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "dials" INTEGER NOT NULL DEFAULT 0,
    "connects" INTEGER NOT NULL DEFAULT 0,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "demosSet" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "BlitzSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlitzSession_createdAt_idx" ON "BlitzSession"("createdAt");

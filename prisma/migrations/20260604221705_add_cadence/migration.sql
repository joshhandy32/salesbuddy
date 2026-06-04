-- CreateTable
CREATE TABLE "Cadence" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "Cadence_pkey" PRIMARY KEY ("id")
);

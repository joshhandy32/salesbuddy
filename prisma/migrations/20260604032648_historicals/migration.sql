-- CreateTable
CREATE TABLE "Historical" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "dials" INTEGER NOT NULL DEFAULT 0,
    "connects" INTEGER NOT NULL DEFAULT 0,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "orumDemoSets" INTEGER NOT NULL DEFAULT 0,
    "otherDemoSets" INTEGER NOT NULL DEFAULT 0,
    "demoShows" INTEGER NOT NULL DEFAULT 0,
    "demoCompletes" INTEGER NOT NULL DEFAULT 0,
    "closedDeals" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reliefs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Historical_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Historical_month_key" ON "Historical"("month");

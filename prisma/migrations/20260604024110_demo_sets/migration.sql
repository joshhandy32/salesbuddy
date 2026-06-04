-- CreateTable
CREATE TABLE "DemoSet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setType" TEXT NOT NULL,
    "prospect" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "demoDate" TIMESTAMP(3) NOT NULL,
    "aeName" TEXT,
    "notes" TEXT,
    "postedToSlack" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DemoSet_pkey" PRIMARY KEY ("id")
);

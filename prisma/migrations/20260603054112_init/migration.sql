-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "repName" TEXT,
    "email" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "rating" INTEGER,
    "feedbackNote" TEXT,
    "corrected" TEXT
);

-- CreateIndex
CREATE INDEX "Brief_repName_createdAt_idx" ON "Brief"("repName", "createdAt");

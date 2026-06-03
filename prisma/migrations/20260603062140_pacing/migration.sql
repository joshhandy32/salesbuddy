-- CreateTable
CREATE TABLE "PacingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "quota" INTEGER NOT NULL DEFAULT 8,
    "commissionModel" TEXT NOT NULL DEFAULT 'percent',
    "commissionRate" REAL NOT NULL DEFAULT 3,
    "flatBonus" REAL NOT NULL DEFAULT 500,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PacingMonth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "shows" INTEGER NOT NULL,
    "completes" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL
);

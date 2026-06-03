-- CreateTable
CREATE TABLE "SlackSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "channelId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackSettings_pkey" PRIMARY KEY ("id")
);

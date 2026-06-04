-- AlterTable
ALTER TABLE "DemoSet" ADD COLUMN     "contactId" TEXT;

-- CreateIndex
CREATE INDEX "DemoSet_contactId_idx" ON "DemoSet"("contactId");

-- AddForeignKey
ALTER TABLE "DemoSet" ADD CONSTRAINT "DemoSet_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

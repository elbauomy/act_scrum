-- AlterTable
ALTER TABLE "LineOfBusiness" ADD COLUMN     "adoLastResult" JSONB,
ADD COLUMN     "adoLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "adoProject" TEXT;

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "adoPath" TEXT;

-- AlterTable
ALTER TABLE "WorkItem" ADD COLUMN     "adoId" INTEGER,
ADD COLUMN     "adoSnapshot" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_lobId_adoId_key" ON "WorkItem"("lobId", "adoId");


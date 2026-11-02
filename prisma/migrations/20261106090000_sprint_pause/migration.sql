-- AlterEnum
ALTER TYPE "SprintState" ADD VALUE 'PAUSED';

-- CreateTable
CREATE TABLE "SprintPause" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "resumedOn" DATE,
    "reason" TEXT NOT NULL DEFAULT '',
    "extendedByDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SprintPause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SprintPause_sprintId_startDate_idx" ON "SprintPause"("sprintId", "startDate");

-- AddForeignKey
ALTER TABLE "SprintPause" ADD CONSTRAINT "SprintPause_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;


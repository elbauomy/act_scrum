-- CreateEnum
CREATE TYPE "SprintState" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

-- AlterTable
ALTER TABLE "WorkItem" ADD COLUMN     "sprintId" TEXT;

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "lobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL DEFAULT '',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "state" "SprintState" NOT NULL DEFAULT 'PLANNED',
    "releaseId" TEXT,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintMemberShare" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SprintMemberShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintCommitment" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carriedOver" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SprintCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "lobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "targetDate" DATE NOT NULL,
    "deployedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseDateChange" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "oldDate" DATE NOT NULL,
    "newDate" DATE NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseDateChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskBaseline" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "baselineStart" DATE NOT NULL,
    "baselineEnd" DATE NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandupEntry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "squadId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "yesterday" TEXT NOT NULL DEFAULT '',
    "today" TEXT NOT NULL DEFAULT '',
    "blockers" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandupEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sprint_lobId_startDate_idx" ON "Sprint"("lobId", "startDate");

-- CreateIndex
CREATE INDEX "Sprint_releaseId_idx" ON "Sprint"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintMemberShare_sprintId_memberId_key" ON "SprintMemberShare"("sprintId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintCommitment_sprintId_workItemId_key" ON "SprintCommitment"("sprintId", "workItemId");

-- CreateIndex
CREATE INDEX "Release_lobId_targetDate_idx" ON "Release"("lobId", "targetDate");

-- CreateIndex
CREATE INDEX "ReleaseDateChange_releaseId_changedAt_idx" ON "ReleaseDateChange"("releaseId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskBaseline_workItemId_key" ON "TaskBaseline"("workItemId");

-- CreateIndex
CREATE INDEX "StandupEntry_squadId_date_idx" ON "StandupEntry"("squadId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StandupEntry_date_squadId_memberId_key" ON "StandupEntry"("date", "squadId", "memberId");

-- CreateIndex
CREATE INDEX "WorkItem_sprintId_idx" ON "WorkItem"("sprintId");

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_lobId_fkey" FOREIGN KEY ("lobId") REFERENCES "LineOfBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintMemberShare" ADD CONSTRAINT "SprintMemberShare_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintMemberShare" ADD CONSTRAINT "SprintMemberShare_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCommitment" ADD CONSTRAINT "SprintCommitment_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCommitment" ADD CONSTRAINT "SprintCommitment_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_lobId_fkey" FOREIGN KEY ("lobId") REFERENCES "LineOfBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseDateChange" ADD CONSTRAINT "ReleaseDateChange_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskBaseline" ADD CONSTRAINT "TaskBaseline_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupEntry" ADD CONSTRAINT "StandupEntry_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupEntry" ADD CONSTRAINT "StandupEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;


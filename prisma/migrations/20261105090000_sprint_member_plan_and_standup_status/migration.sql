-- AlterTable
ALTER TABLE "StandupEntry" ADD COLUMN     "status" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "SprintMemberPlan" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "availabilityPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "initialHours" DOUBLE PRECISION NOT NULL,
    "meetingsHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vacationHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "excuseHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capacityHours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SprintMemberPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SprintMemberPlan_memberId_idx" ON "SprintMemberPlan"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintMemberPlan_sprintId_memberId_key" ON "SprintMemberPlan"("sprintId", "memberId");

-- AddForeignKey
ALTER TABLE "SprintMemberPlan" ADD CONSTRAINT "SprintMemberPlan_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintMemberPlan" ADD CONSTRAINT "SprintMemberPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;


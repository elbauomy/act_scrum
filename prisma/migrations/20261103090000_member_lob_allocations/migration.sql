-- CreateTable
CREATE TABLE "MemberLobAllocation" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "lobId" TEXT NOT NULL,
    "weeklyHours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MemberLobAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberLobAllocation_lobId_idx" ON "MemberLobAllocation"("lobId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberLobAllocation_membershipId_lobId_key" ON "MemberLobAllocation"("membershipId", "lobId");

-- AddForeignKey
ALTER TABLE "MemberLobAllocation" ADD CONSTRAINT "MemberLobAllocation_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "SquadMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberLobAllocation" ADD CONSTRAINT "MemberLobAllocation_lobId_fkey" FOREIGN KEY ("lobId") REFERENCES "LineOfBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;


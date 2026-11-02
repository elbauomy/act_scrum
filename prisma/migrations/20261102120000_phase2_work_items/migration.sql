-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('EPIC', 'FEATURE', 'STORY', 'BUG', 'TASK');

-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('NEW', 'APPROVED', 'COMMITTED', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "LineOfBusiness" ADD COLUMN     "key" TEXT,
ADD COLUMN     "nextItemNumber" INTEGER NOT NULL DEFAULT 1;

-- Give existing lines of business a short key from their name (e.g. "Retail Banking" -> "RETA").
-- Duplicates get a number suffix. The key can be edited later in the app.
WITH base AS (
  SELECT id,
         COALESCE(NULLIF(UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 4)), ''), 'LOB') AS k
  FROM "LineOfBusiness"
), ranked AS (
  SELECT id, k, ROW_NUMBER() OVER (PARTITION BY k ORDER BY id) AS rn FROM base
)
UPDATE "LineOfBusiness" l
SET "key" = r.k || CASE WHEN r.rn > 1 THEN r.rn::text ELSE '' END
FROM ranked r WHERE l.id = r.id;

ALTER TABLE "LineOfBusiness" ALTER COLUMN "key" SET NOT NULL;

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL,
    "type" "WorkItemType" NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "acceptanceCriteria" TEXT NOT NULL DEFAULT '',
    "status" "WorkItemStatus" NOT NULL DEFAULT 'NEW',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "rank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lobId" TEXT NOT NULL,
    "parentId" TEXT,
    "assigneeId" TEXT,
    "estimateHours" DOUBLE PRECISION,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT NOT NULL DEFAULT '',
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItemHistory" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkItem_parentId_idx" ON "WorkItem"("parentId");

-- CreateIndex
CREATE INDEX "WorkItem_assigneeId_idx" ON "WorkItem"("assigneeId");

-- CreateIndex
CREATE INDEX "WorkItem_lobId_type_idx" ON "WorkItem"("lobId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_lobId_number_key" ON "WorkItem"("lobId", "number");

-- CreateIndex
CREATE INDEX "WorkItemHistory_workItemId_changedAt_idx" ON "WorkItemHistory"("workItemId", "changedAt");

-- CreateIndex
CREATE INDEX "WorkItemHistory_field_changedAt_idx" ON "WorkItemHistory"("field", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LineOfBusiness_key_key" ON "LineOfBusiness"("key");

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_lobId_fkey" FOREIGN KEY ("lobId") REFERENCES "LineOfBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemHistory" ADD CONSTRAINT "WorkItemHistory_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;


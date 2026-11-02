-- AlterTable
ALTER TABLE "StandupEntry" ADD COLUMN     "off" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offReason" TEXT NOT NULL DEFAULT '';


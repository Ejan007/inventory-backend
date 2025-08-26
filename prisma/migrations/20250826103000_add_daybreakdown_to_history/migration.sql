-- AlterTable: add dayBreakdown JSONB to ItemHistory
ALTER TABLE "ItemHistory" ADD COLUMN "dayBreakdown" JSONB;

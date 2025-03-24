-- DropForeignKey
ALTER TABLE "ItemHistory" DROP CONSTRAINT "ItemHistory_itemId_fkey";

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

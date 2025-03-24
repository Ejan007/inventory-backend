-- CreateTable
CREATE TABLE "ItemHistory" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

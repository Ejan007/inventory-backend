-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "storeId" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "fridayRequired" DROP DEFAULT,
ALTER COLUMN "mondayRequired" DROP DEFAULT,
ALTER COLUMN "saturdayRequired" DROP DEFAULT,
ALTER COLUMN "sundayRequired" DROP DEFAULT,
ALTER COLUMN "thursdayRequired" DROP DEFAULT,
ALTER COLUMN "tuesdayRequired" DROP DEFAULT,
ALTER COLUMN "wednesdayRequired" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `baseline` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "baseline",
ADD COLUMN     "fridayRequired" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "mondayRequired" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "saturdayRequired" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "sundayRequired" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "thursdayRequired" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "tuesdayRequired" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "wednesdayRequired" INTEGER NOT NULL DEFAULT 100;

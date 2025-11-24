/*
  Warnings:

  - You are about to drop the column `userId` on the `payment_methods` table. All the data in the column will be lost.
  - Added the required column `restaurantId` to the `payment_methods` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_userId_fkey";

-- AlterTable
ALTER TABLE "payment_methods" DROP COLUMN "userId",
ADD COLUMN     "restaurantId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

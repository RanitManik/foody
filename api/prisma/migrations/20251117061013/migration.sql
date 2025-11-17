/*
  Warnings:

  - You are about to drop the column `assignedLocation` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_assignedLocation_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "assignedLocation",
ADD COLUMN     "restaurantId" TEXT;

-- CreateIndex
CREATE INDEX "users_restaurantId_idx" ON "users"("restaurantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - The values [MANAGER_INDIA,MANAGER_AMERICA,MEMBER_INDIA,MEMBER_AMERICA] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `country` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[location]` on the table `restaurants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `location` to the `restaurants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropIndex
DROP INDEX "restaurants_country_idx";

-- DropIndex
DROP INDEX "restaurants_country_isActive_idx";

-- DropIndex
DROP INDEX "users_country_idx";

-- AlterTable
ALTER TABLE "restaurants" DROP COLUMN "country",
ADD COLUMN     "location" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "country",
ADD COLUMN     "assignedLocation" TEXT;

-- DropEnum
DROP TYPE "Country";

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_location_key" ON "restaurants"("location");

-- CreateIndex
CREATE INDEX "users_assignedLocation_idx" ON "users"("assignedLocation");

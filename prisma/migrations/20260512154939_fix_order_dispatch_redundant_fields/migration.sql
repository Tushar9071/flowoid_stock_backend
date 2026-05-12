/*
  Warnings:

  - You are about to drop the column `designId` on the `order_dispatch_items` table. All the data in the column will be lost.
  - You are about to drop the column `trackingRef` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `transportMode` on the `orders` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_dispatch_items" DROP CONSTRAINT "order_dispatch_items_designId_fkey";

-- AlterTable
ALTER TABLE "order_dispatch_items" DROP COLUMN "designId";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "trackingRef",
DROP COLUMN "transportMode";

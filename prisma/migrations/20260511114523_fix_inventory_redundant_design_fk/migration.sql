/*
  Warnings:

  - You are about to drop the column `designId` on the `inventory_adjustments` table. All the data in the column will be lost.
  - You are about to drop the column `designId` on the `packaging_batches` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory_adjustments" DROP CONSTRAINT "inventory_adjustments_designId_fkey";

-- DropForeignKey
ALTER TABLE "packaging_batches" DROP CONSTRAINT "packaging_batches_designId_fkey";

-- DropIndex
DROP INDEX "inventory_adjustments_tenantId_designId_idx";

-- DropIndex
DROP INDEX "packaging_batches_tenantId_designId_idx";

-- AlterTable
ALTER TABLE "inventory_adjustments" DROP COLUMN "designId";

-- AlterTable
ALTER TABLE "packaging_batches" DROP COLUMN "designId";

-- CreateIndex
CREATE INDEX "inventory_adjustments_tenantId_inventoryStockId_idx" ON "inventory_adjustments"("tenantId", "inventoryStockId");

-- CreateIndex
CREATE INDEX "packaging_batches_tenantId_inventoryStockId_idx" ON "packaging_batches"("tenantId", "inventoryStockId");

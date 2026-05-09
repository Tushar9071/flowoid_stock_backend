-- CreateEnum
CREATE TYPE "InventoryAdjustmentType" AS ENUM ('UNPACKAGED', 'PACKAGED');

-- CreateTable
CREATE TABLE "inventory_stocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "unpackagedPieces" INTEGER NOT NULL DEFAULT 0,
    "packagedDozens" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlertAt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryStockId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "dozensPackaged" INTEGER NOT NULL,
    "piecesUsed" INTEGER NOT NULL,
    "packedById" TEXT NOT NULL,
    "packedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryStockId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "type" "InventoryAdjustmentType" NOT NULL,
    "adjustment" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "adjustedById" TEXT NOT NULL,
    "adjustedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_stocks_tenantId_packagedDozens_idx" ON "inventory_stocks"("tenantId", "packagedDozens");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stocks_designId_key" ON "inventory_stocks"("designId");

-- CreateIndex
CREATE INDEX "packaging_batches_tenantId_designId_idx" ON "packaging_batches"("tenantId", "designId");

-- CreateIndex
CREATE INDEX "packaging_batches_tenantId_packedAt_idx" ON "packaging_batches"("tenantId", "packedAt");

-- CreateIndex
CREATE INDEX "inventory_adjustments_tenantId_designId_idx" ON "inventory_adjustments"("tenantId", "designId");

-- CreateIndex
CREATE INDEX "inventory_adjustments_tenantId_adjustedAt_idx" ON "inventory_adjustments"("tenantId", "adjustedAt");

-- AddForeignKey
ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stocks_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_batches" ADD CONSTRAINT "packaging_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_batches" ADD CONSTRAINT "packaging_batches_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "inventory_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_batches" ADD CONSTRAINT "packaging_batches_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_batches" ADD CONSTRAINT "packaging_batches_packedById_fkey" FOREIGN KEY ("packedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "inventory_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

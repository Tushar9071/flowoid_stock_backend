-- Migrate finished-goods inventory and orders from dozens to pieces.

-- inventory_stocks
ALTER TABLE "inventory_stocks" RENAME COLUMN "packagedDozens" TO "packagedPieces";
UPDATE "inventory_stocks" SET "packagedPieces" = "packagedPieces" * 12;
UPDATE "inventory_stocks" SET "lowStockAlertAt" = "lowStockAlertAt" * 12 WHERE "lowStockAlertAt" > 0;

DROP INDEX IF EXISTS "inventory_stocks_tenantId_packagedDozens_idx";
CREATE INDEX "inventory_stocks_tenantId_packagedPieces_idx" ON "inventory_stocks"("tenantId", "packagedPieces");

-- packaging_batches: piecesUsed already stores true piece count
ALTER TABLE "packaging_batches" RENAME COLUMN "piecesUsed" TO "piecesPackaged";
ALTER TABLE "packaging_batches" DROP COLUMN "dozensPackaged";

-- order_items
ALTER TABLE "order_items" RENAME COLUMN "quantityDozens" TO "quantityPieces";
UPDATE "order_items" SET "quantityPieces" = "quantityPieces" * 12;
ALTER TABLE "order_items" RENAME COLUMN "dispatchedDozens" TO "dispatchedPieces";
UPDATE "order_items" SET "dispatchedPieces" = "dispatchedPieces" * 12;
ALTER TABLE "order_items" RENAME COLUMN "pricePerDozen" TO "pricePerPiece";
UPDATE "order_items" SET "pricePerPiece" = ROUND(("pricePerPiece" / 12)::numeric, 2);

-- order_dispatch_items
ALTER TABLE "order_dispatch_items" RENAME COLUMN "dozensDispatched" TO "piecesDispatched";
UPDATE "order_dispatch_items" SET "piecesDispatched" = "piecesDispatched" * 12;

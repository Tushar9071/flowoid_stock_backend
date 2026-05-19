-- Remove inventory low stock alert feature (threshold column).

ALTER TABLE "inventory_stocks"
  DROP COLUMN IF EXISTS "lowStockAlertAt";

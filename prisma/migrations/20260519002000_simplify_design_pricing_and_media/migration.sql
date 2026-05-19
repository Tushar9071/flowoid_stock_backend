-- Simplify design catalogue fields and store sale price per finished unit.
ALTER TABLE "designs"
  ADD COLUMN IF NOT EXISTS "salePriceRs" DECIMAL(10, 2);

UPDATE "designs"
SET "salePriceRs" = ROUND(("salePricePerDozen" / 12)::numeric, 2)
WHERE "salePriceRs" IS NULL
  AND "salePricePerDozen" IS NOT NULL;

ALTER TABLE "designs"
  ALTER COLUMN "salePriceRs" SET NOT NULL;

ALTER TABLE "designs"
  DROP COLUMN IF EXISTS "material",
  DROP COLUMN IF EXISTS "finish",
  DROP COLUMN IF EXISTS "salePricePerDozen";

-- Track raw material movement direction so assignment cancellation can return stock.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RawMaterialMovementType') THEN
    CREATE TYPE "RawMaterialMovementType" AS ENUM ('ISSUE', 'RETURN');
  END IF;
END $$;

ALTER TABLE "raw_material_issuances"
  ADD COLUMN IF NOT EXISTS "movementType" "RawMaterialMovementType" NOT NULL DEFAULT 'ISSUE';

CREATE INDEX IF NOT EXISTS "raw_material_issuances_tenantId_assignmentId_movementType_idx"
  ON "raw_material_issuances"("tenantId", "assignmentId", "movementType");

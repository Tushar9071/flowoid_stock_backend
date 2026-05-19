-- Allow one worker assignment to consume multiple raw material types.
DROP INDEX IF EXISTS "raw_material_issuances_assignmentId_key";

CREATE INDEX IF NOT EXISTS "raw_material_issuances_tenantId_assignmentId_idx"
  ON "raw_material_issuances"("tenantId", "assignmentId");

ALTER TABLE "worker_assignments"
  DROP CONSTRAINT IF EXISTS "worker_assignments_rawMaterialTypeId_fkey";

DROP INDEX IF EXISTS "worker_assignments_tenantId_rawMaterialTypeId_idx";

ALTER TABLE "worker_assignments"
  DROP COLUMN IF EXISTS "rawMaterialTypeId",
  DROP COLUMN IF EXISTS "rawMaterialQty";

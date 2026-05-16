-- Structured logs for admin observability.
CREATE TABLE IF NOT EXISTS "system_logs" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "requestId" TEXT,
  "userId" TEXT,
  "ip" TEXT,
  "endpoint" TEXT,
  "statusCode" INTEGER,
  "duration" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "system_logs_level_idx" ON "system_logs"("level");
CREATE INDEX IF NOT EXISTS "system_logs_category_idx" ON "system_logs"("category");
CREATE INDEX IF NOT EXISTS "system_logs_createdAt_idx" ON "system_logs"("createdAt");

-- Soft-delete metadata on critical models.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "raw_material_types" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "raw_material_purchases" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "designs" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "supplementary_material_types" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

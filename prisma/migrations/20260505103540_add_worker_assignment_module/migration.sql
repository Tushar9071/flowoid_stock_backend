/*
  Warnings:

  - You are about to drop the column `issuedTo` on the `raw_material_issuances` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `raw_material_issuances` table. All the data in the column will be lost.
  - You are about to drop the column `referenceType` on the `raw_material_issuances` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[assignmentId]` on the table `raw_material_issuances` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assignmentId` to the `raw_material_issuances` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ISSUED', 'IN_PROGRESS', 'PARTIALLY_RETURNED', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkerPaymentType" AS ENUM ('EARNING_SETTLEMENT', 'ADVANCE', 'ADVANCE_RECOVERY');

-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('ACTIVE', 'DISCONTINUED', 'DRAFT');

-- Prisma uses application-generated UUIDs, but we need DB-side ids for
-- preserving legacy rows during the migration.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add the new relation column as nullable first so existing rows can be
-- backfilled before we enforce the constraint.
ALTER TABLE "raw_material_issuances" ADD COLUMN "assignmentId" TEXT;

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "idProofType" TEXT,
    "idProofNumber" TEXT,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "openingBalanceType" TEXT NOT NULL DEFAULT 'PAYABLE',
    "openingBalanceDate" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "designCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "material" TEXT,
    "finish" TEXT,
    "diamondCount" INTEGER NOT NULL DEFAULT 0,
    "pieceRateRs" DECIMAL(10,2) NOT NULL,
    "salePricePerDozen" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "status" "DesignStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_supplementary_needs" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "materialTypeId" TEXT NOT NULL,
    "quantityPerPiece" DECIMAL(10,4) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "design_supplementary_needs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplementary_material_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "stockQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplementary_material_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplementary_issuances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "materialTypeId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplementary_issuances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "rawMaterialTypeId" TEXT NOT NULL,
    "rawMaterialQty" DECIMAL(18,4) NOT NULL,
    "expectedPieces" INTEGER NOT NULL,
    "returnedPieces" INTEGER NOT NULL DEFAULT 0,
    "rejectedPieces" INTEGER NOT NULL DEFAULT 0,
    "pieceRateAtAssignment" DECIMAL(10,2) NOT NULL,
    "totalEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_returns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "piecesReturned" INTEGER NOT NULL,
    "rejectedPieces" INTEGER NOT NULL DEFAULT 0,
    "acceptedPieces" INTEGER NOT NULL,
    "earningAmount" DECIMAL(12,2) NOT NULL,
    "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejectionNotes" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentType" "WorkerPaymentType" NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_payments_pkey" PRIMARY KEY ("id")
);

CREATE TEMP TABLE "legacy_manual_issuances" AS
SELECT
    r."id" AS "issuanceId",
    r."tenantId",
    r."materialTypeId",
    r."quantity",
    COALESCE(NULLIF(BTRIM(r."issuedTo"), ''), 'Legacy Worker') AS "workerName",
    r."issuedTo",
    r."referenceId",
    r."referenceType",
    r."issuedAt",
    r."notes",
    r."createdById",
    r."createdAt",
    r."updatedAt",
    gen_random_uuid()::TEXT AS "workerId",
    gen_random_uuid()::TEXT AS "designId",
    gen_random_uuid()::TEXT AS "assignmentId"
FROM "raw_material_issuances" r
WHERE r."assignmentId" IS NULL;

INSERT INTO "design_categories" ("id", "tenantId", "name", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT ON (l."tenantId")
    gen_random_uuid()::TEXT,
    l."tenantId",
    'Legacy Migrated',
    0,
    true,
    l."createdAt",
    l."updatedAt"
FROM "legacy_manual_issuances" l
WHERE NOT EXISTS (
    SELECT 1
    FROM "design_categories" dc
    WHERE dc."tenantId" = l."tenantId"
      AND dc."name" = 'Legacy Migrated'
);

INSERT INTO "workers" (
    "id",
    "tenantId",
    "name",
    "phone",
    "alternatePhone",
    "address",
    "city",
    "idProofType",
    "idProofNumber",
    "openingBalance",
    "openingBalanceType",
    "openingBalanceDate",
    "notes",
    "isActive",
    "deletedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    l."workerId",
    l."tenantId",
    l."workerName",
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    'PAYABLE',
    NULL,
    CONCAT('Auto-created while migrating legacy raw material issuance ', l."issuanceId", '. Original issuedTo: ', COALESCE(l."issuedTo", 'N/A')),
    true,
    NULL,
    l."createdAt",
    l."updatedAt"
FROM "legacy_manual_issuances" l;

INSERT INTO "designs" (
    "id",
    "tenantId",
    "categoryId",
    "designCode",
    "name",
    "description",
    "material",
    "finish",
    "diamondCount",
    "pieceRateRs",
    "salePricePerDozen",
    "imageUrl",
    "status",
    "deletedAt",
    "notes",
    "createdById",
    "createdAt",
    "updatedAt"
)
SELECT
    l."designId",
    l."tenantId",
    dc."id",
    CONCAT('LEGACY-', UPPER(REPLACE(SUBSTRING(l."issuanceId" FROM 1 FOR 8), '-', ''))),
    CONCAT('Legacy Manual Issuance ', SUBSTRING(l."issuanceId" FROM 1 FOR 8)),
    'Auto-created during worker assignment migration so legacy raw material issuances remain queryable.',
    NULL,
    NULL,
    0,
    0.00,
    0.00,
    NULL,
    'DISCONTINUED',
    NULL,
    CONCAT('Migrated from legacy raw_material_issuances row ', l."issuanceId", '. Reference type: ', COALESCE(l."referenceType", 'N/A'), '. Reference id: ', COALESCE(l."referenceId", 'N/A')),
    l."createdById",
    l."createdAt",
    l."updatedAt"
FROM "legacy_manual_issuances" l
JOIN "design_categories" dc
  ON dc."tenantId" = l."tenantId"
 AND dc."name" = 'Legacy Migrated';

INSERT INTO "worker_assignments" (
    "id",
    "tenantId",
    "workerId",
    "designId",
    "rawMaterialTypeId",
    "rawMaterialQty",
    "expectedPieces",
    "returnedPieces",
    "rejectedPieces",
    "pieceRateAtAssignment",
    "totalEarned",
    "status",
    "issuedAt",
    "expectedReturnDate",
    "completedAt",
    "notes",
    "createdById",
    "createdAt",
    "updatedAt"
)
SELECT
    l."assignmentId",
    l."tenantId",
    l."workerId",
    l."designId",
    l."materialTypeId",
    l."quantity",
    0,
    0,
    0,
    0.00,
    0.00,
    'ISSUED',
    l."issuedAt",
    NULL,
    NULL,
    CONCAT('Auto-created while migrating legacy raw material issuance ', l."issuanceId", '. Original notes: ', COALESCE(l."notes", 'N/A')),
    l."createdById",
    l."createdAt",
    l."updatedAt"
FROM "legacy_manual_issuances" l;

UPDATE "raw_material_issuances" r
SET "assignmentId" = l."assignmentId"
FROM "legacy_manual_issuances" l
WHERE r."id" = l."issuanceId";

DROP TABLE "legacy_manual_issuances";

-- Drop the legacy soft-reference columns only after the rows have a valid
-- assignment id in the new worker-assignment model.
DROP INDEX "raw_material_issuances_tenantId_referenceId_idx";

ALTER TABLE "raw_material_issuances"
DROP COLUMN "issuedTo",
DROP COLUMN "referenceId",
DROP COLUMN "referenceType",
ALTER COLUMN "assignmentId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "workers_tenantId_isActive_idx" ON "workers"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "workers_tenantId_name_idx" ON "workers"("tenantId", "name");

-- CreateIndex
CREATE INDEX "workers_tenantId_phone_idx" ON "workers"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "design_categories_tenantId_isActive_idx" ON "design_categories"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "design_categories_tenantId_name_key" ON "design_categories"("tenantId", "name");

-- CreateIndex
CREATE INDEX "designs_tenantId_status_idx" ON "designs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "designs_tenantId_categoryId_idx" ON "designs"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "designs_tenantId_designCode_key" ON "designs"("tenantId", "designCode");

-- CreateIndex
CREATE UNIQUE INDEX "design_supplementary_needs_designId_materialTypeId_key" ON "design_supplementary_needs"("designId", "materialTypeId");

-- CreateIndex
CREATE INDEX "supplementary_material_types_tenantId_isActive_idx" ON "supplementary_material_types"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "supplementary_material_types_tenantId_name_key" ON "supplementary_material_types"("tenantId", "name");

-- CreateIndex
CREATE INDEX "supplementary_issuances_tenantId_assignmentId_idx" ON "supplementary_issuances"("tenantId", "assignmentId");

-- CreateIndex
CREATE INDEX "supplementary_issuances_tenantId_materialTypeId_idx" ON "supplementary_issuances"("tenantId", "materialTypeId");

-- CreateIndex
CREATE INDEX "worker_assignments_tenantId_workerId_idx" ON "worker_assignments"("tenantId", "workerId");

-- CreateIndex
CREATE INDEX "worker_assignments_tenantId_designId_idx" ON "worker_assignments"("tenantId", "designId");

-- CreateIndex
CREATE INDEX "worker_assignments_tenantId_status_idx" ON "worker_assignments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "worker_assignments_tenantId_issuedAt_idx" ON "worker_assignments"("tenantId", "issuedAt");

-- CreateIndex
CREATE INDEX "goods_returns_tenantId_assignmentId_idx" ON "goods_returns"("tenantId", "assignmentId");

-- CreateIndex
CREATE INDEX "goods_returns_tenantId_returnedAt_idx" ON "goods_returns"("tenantId", "returnedAt");

-- CreateIndex
CREATE INDEX "worker_payments_tenantId_workerId_idx" ON "worker_payments"("tenantId", "workerId");

-- CreateIndex
CREATE INDEX "worker_payments_tenantId_paidAt_idx" ON "worker_payments"("tenantId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_issuances_assignmentId_key" ON "raw_material_issuances"("assignmentId");

-- AddForeignKey
ALTER TABLE "raw_material_issuances" ADD CONSTRAINT "raw_material_issuances_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "worker_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_categories" ADD CONSTRAINT "design_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "design_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_supplementary_needs" ADD CONSTRAINT "design_supplementary_needs_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_supplementary_needs" ADD CONSTRAINT "design_supplementary_needs_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "supplementary_material_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_material_types" ADD CONSTRAINT "supplementary_material_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_issuances" ADD CONSTRAINT "supplementary_issuances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_issuances" ADD CONSTRAINT "supplementary_issuances_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "worker_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_issuances" ADD CONSTRAINT "supplementary_issuances_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "supplementary_material_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_issuances" ADD CONSTRAINT "supplementary_issuances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_rawMaterialTypeId_fkey" FOREIGN KEY ("rawMaterialTypeId") REFERENCES "raw_material_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_assignments" ADD CONSTRAINT "worker_assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_returns" ADD CONSTRAINT "goods_returns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_returns" ADD CONSTRAINT "goods_returns_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "worker_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_returns" ADD CONSTRAINT "goods_returns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_payments" ADD CONSTRAINT "worker_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_payments" ADD CONSTRAINT "worker_payments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_payments" ADD CONSTRAINT "worker_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

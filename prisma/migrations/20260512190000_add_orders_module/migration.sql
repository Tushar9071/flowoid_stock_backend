-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PACKED', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCreditOrder" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "subtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "packedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "quantityDozens" INTEGER NOT NULL,
    "dispatchedDozens" INTEGER NOT NULL DEFAULT 0,
    "pricePerDozen" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_dispatches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transportMode" TEXT NOT NULL,
    "trackingRef" TEXT,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_dispatch_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "inventoryStockId" TEXT NOT NULL,
    "dozensDispatched" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenantId_orderNumber_key" ON "orders"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "orders_tenantId_dealerId_idx" ON "orders"("tenantId", "dealerId");

-- CreateIndex
CREATE INDEX "orders_tenantId_status_idx" ON "orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "orders_tenantId_orderDate_idx" ON "orders"("tenantId", "orderDate");

-- CreateIndex
CREATE INDEX "orders_tenantId_dueDate_idx" ON "orders"("tenantId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_designId_key" ON "order_items"("orderId", "designId");

-- CreateIndex
CREATE INDEX "order_items_tenantId_orderId_idx" ON "order_items"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "order_items_tenantId_designId_idx" ON "order_items"("tenantId", "designId");

-- CreateIndex
CREATE INDEX "order_dispatches_tenantId_orderId_idx" ON "order_dispatches"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "order_dispatches_tenantId_dispatchedAt_idx" ON "order_dispatches"("tenantId", "dispatchedAt");

-- CreateIndex
CREATE INDEX "order_dispatch_items_tenantId_dispatchId_idx" ON "order_dispatch_items"("tenantId", "dispatchId");

-- CreateIndex
CREATE INDEX "order_dispatch_items_tenantId_orderItemId_idx" ON "order_dispatch_items"("tenantId", "orderItemId");

-- CreateIndex
CREATE INDEX "order_dispatch_items_tenantId_inventoryStockId_idx" ON "order_dispatch_items"("tenantId", "inventoryStockId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatch_items" ADD CONSTRAINT "order_dispatch_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatch_items" ADD CONSTRAINT "order_dispatch_items_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "order_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatch_items" ADD CONSTRAINT "order_dispatch_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatch_items" ADD CONSTRAINT "order_dispatch_items_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "inventory_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./inventory.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

/**
 * @swagger
 * /api/tenants/{tenantId}/inventory/stock:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory stock for designs with stock activity
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: query
 *         name: designId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: isLow
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/InventoryStockListSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/stock", requirePermission("inventory.read"), ctrl.getStockOverview);

/**
 * @swagger
 * /api/tenants/{tenantId}/inventory/stock/alerts:
 *   get:
 *     tags: [Inventory]
 *     summary: List designs below their packaged stock alert threshold
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/InventoryLowStockAlertListSuccess'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/stock/alerts", requirePermission("inventory.read"), ctrl.getLowStockAlerts);

/**
 * @swagger
 * /api/tenants/{tenantId}/inventory/stock/{designId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get one design's stock with packaging history
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/InventoryStockDetailSuccess'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get("/stock/:designId", requirePermission("inventory.read"), ctrl.getStockByDesign);

/**
 * @swagger
 * /api/tenants/{tenantId}/inventory/stock/{designId}/alert:
 *   patch:
 *     tags: [Inventory]
 *     summary: Set packaged stock low alert threshold
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInventoryLowStockAlertRequest'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/InventoryStockSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch(
  "/stock/:designId/alert",
  requirePermission("inventory.update"),
  ctrl.updateLowStockAlert,
);

/**
 * @swagger
 * /api/tenants/{tenantId}/inventory/stock/{designId}/adjustment:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a manual inventory stock adjustment
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventoryAdjustmentRequest'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/InventoryAdjustmentCreateSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  "/stock/:designId/adjustment",
  requirePermission("inventory.update"),
  ctrl.createStockAdjustment,
);

/**
 * @swagger
 * /api/tenants/{tenantId}/inventory/packaging:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a packaging batch from unpackaged pieces
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePackagingBatchRequest'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/PackagingBatchCreateSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   get:
 *     tags: [Inventory]
 *     summary: List packaging batches
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: query
 *         name: designId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/PackagingBatchListSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post("/packaging", requirePermission("inventory.create"), ctrl.createPackagingBatch);
router.get("/packaging", requirePermission("inventory.read"), ctrl.getPackagingBatches);

/**
 * @swagger
 * /api/tenants/{tenantId}/inventory/packaging/{batchId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get one packaging batch
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/PackagingBatchSuccess'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  "/packaging/:batchId",
  requirePermission("inventory.read"),
  ctrl.getPackagingBatchById,
);

export default router;

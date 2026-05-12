import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./orders.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List tenant orders with filters and pagination
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: query
 *         name: dealerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/OrderStatus' }
 *       - in: query
 *         name: isCreditOrder
 *         schema: { type: boolean }
 *       - in: query
 *         name: isOverdue
 *         schema: { type: boolean }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderListSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *   post:
 *     tags: [Orders]
 *     summary: Create a draft order
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get("/", requirePermission("orders.read"), ctrl.getOrders);
router.post("/", requirePermission("orders.create"), ctrl.createOrder);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/overdue:
 *   get:
 *     tags: [Orders]
 *     summary: List overdue dispatched credit orders
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OverdueOrderListSuccess'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/overdue", requirePermission("orders.read"), ctrl.getOverdueOrders);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}/dispatch-summary:
 *   get:
 *     tags: [Orders]
 *     summary: Get a printable dispatch summary for an order
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderDispatchSummarySuccess'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  "/:orderId/dispatch-summary",
  requirePermission("orders.read"),
  ctrl.getDispatchSummary,
);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order with full details
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   patch:
 *     tags: [Orders]
 *     summary: Update a draft order
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderRequest'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get("/:orderId", requirePermission("orders.read"), ctrl.getOrderById);
router.patch("/:orderId", requirePermission("orders.update"), ctrl.updateOrder);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}/confirm:
 *   patch:
 *     tags: [Orders]
 *     summary: Confirm an order after stock validation
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch("/:orderId/confirm", requirePermission("orders.update"), ctrl.confirmOrder);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}/pack:
 *   patch:
 *     tags: [Orders]
 *     summary: Mark a confirmed order as packed
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch("/:orderId/pack", requirePermission("orders.update"), ctrl.packOrder);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}/dispatch:
 *   patch:
 *     tags: [Orders]
 *     summary: Dispatch an order and deduct packaged stock
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DispatchOrderRequest'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch("/:orderId/dispatch", requirePermission("orders.dispatch"), ctrl.dispatchOrder);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: Cancel an order before full dispatch
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelOrderRequest'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch("/:orderId/cancel", requirePermission("orders.cancel"), ctrl.cancelOrder);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}/items:
 *   post:
 *     tags: [Orders]
 *     summary: Add a line item to a draft order
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddOrderItemRequest'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post("/:orderId/items", requirePermission("orders.update"), ctrl.addOrderItem);

/**
 * @swagger
 * /api/tenants/{tenantId}/orders/{orderId}/items/{itemId}:
 *   patch:
 *     tags: [Orders]
 *     summary: Update a line item in a draft order
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *       - $ref: '#/components/parameters/OrderItemIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderItemRequest'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     tags: [Orders]
 *     summary: Remove a line item from a draft order
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *       - $ref: '#/components/parameters/OrderItemIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrderSuccess'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch("/:orderId/items/:itemId", requirePermission("orders.update"), ctrl.updateOrderItem);
router.delete("/:orderId/items/:itemId", requirePermission("orders.update"), ctrl.removeOrderItem);

export default router;

import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./documents.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

/**
 * @swagger
 * /api/tenants/{tenantId}/documents/orders/{orderId}/invoice:
 *   get:
 *     tags: [Documents]
 *     summary: Generate sales invoice PDF for an order
 *     produces:
 *       - application/pdf
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  "/orders/:orderId/invoice",
  requirePermission("documents.read"),
  ctrl.getInvoice,
);

/**
 * @swagger
 * /api/tenants/{tenantId}/documents/orders/{orderId}/challan:
 *   get:
 *     tags: [Documents]
 *     summary: Generate delivery challan PDF for an order
 *     produces:
 *       - application/pdf
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - $ref: '#/components/parameters/OrderIdPathParam'
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  "/orders/:orderId/challan",
  requirePermission("documents.read"),
  ctrl.getChallan,
);

/**
 * @swagger
 * /api/tenants/{tenantId}/documents/payments/{paymentId}/receipt:
 *   get:
 *     tags: [Documents]
 *     summary: Generate payment receipt PDF
 *     produces:
 *       - application/pdf
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdPathParam'
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  "/payments/:paymentId/receipt",
  requirePermission("documents.read"),
  ctrl.getPaymentReceipt,
);

export default router;

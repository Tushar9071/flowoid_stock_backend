import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./whatsapp.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

/**
 * @openapi
 * /api/tenants/{tenantId}/whatsapp/config:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Save WhatsApp Cloud API configuration
 *   get:
 *     tags: [WhatsApp]
 *     summary: Get masked WhatsApp Cloud API configuration
 */
router.post("/config", ctrl.saveConfig);
router.get("/config", ctrl.getConfig);

/**
 * @openapi
 * /api/tenants/{tenantId}/whatsapp/config/test:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Test WhatsApp Cloud API connection
 */
router.post("/config/test", ctrl.testConnection);

router.post("/send/invoice/:orderId", ctrl.sendInvoice);
router.post("/send/receipt/:paymentId", ctrl.sendPaymentReceipt);
router.post("/send/challan/:dispatchId", ctrl.sendDeliveryChallan);

router.get("/logs", ctrl.getLogs);
router.get("/logs/:id", ctrl.getLogById);

router.post("/templates", ctrl.submitTemplate);
router.get("/templates", ctrl.listTemplates);

export default router;

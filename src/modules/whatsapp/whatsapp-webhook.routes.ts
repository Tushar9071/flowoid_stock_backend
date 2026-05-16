import { Router } from "express";

import * as ctrl from "./whatsapp-webhook.controller";

const router: Router = Router();

/**
 * @openapi
 * /webhooks/whatsapp:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Verify Meta WhatsApp webhook
 *     security: []
 *   post:
 *     tags: [WhatsApp]
 *     summary: Receive WhatsApp message status callbacks
 *     security: []
 */
router.get("/whatsapp", ctrl.verifyWebhook);
router.post("/whatsapp", ctrl.receiveStatusUpdate);

export default router;

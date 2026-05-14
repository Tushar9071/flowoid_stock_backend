import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./documents.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/orders/:orderId/invoice", ctrl.getInvoice);

router.get("/orders/:orderId/challan", ctrl.getChallan);

router.get("/payments/:paymentId/receipt", ctrl.getPaymentReceipt);

export default router;

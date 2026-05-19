import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./payments.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", ctrl.getAllPayments);

router.get("/aging-report", ctrl.getAgingReport);

router.get("/cashflow", ctrl.getDailyCashFlow);

router.get("/party/:partyId/order-outstanding", ctrl.getPartyOrderOutstanding);

router.get("/party/:partyId/outstanding", ctrl.getPartyOutstanding);

router.post("/dealer", ctrl.createDealerPayment);

router.post("/supplier", ctrl.createSupplierPayment);

router.patch("/:paymentId/status", ctrl.updatePaymentStatus);

router.get("/:paymentId", ctrl.getPaymentById);

export default router;

import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./orders.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", ctrl.getOrders);
router.post("/", ctrl.createOrder);

router.get("/overdue", ctrl.getOverdueOrders);

router.get("/:orderId/dispatch-summary", ctrl.getDispatchSummary);

router.get("/:orderId", ctrl.getOrderById);
router.patch("/:orderId", ctrl.updateOrder);

router.patch("/:orderId/confirm", ctrl.confirmOrder);
router.patch("/:orderId/pack", ctrl.packOrder);
router.patch("/:orderId/dispatch", ctrl.dispatchOrder);
router.patch("/:orderId/cancel", ctrl.cancelOrder);

router.post("/:orderId/items", ctrl.addOrderItem);
router.patch("/:orderId/items/:itemId", ctrl.updateOrderItem);
router.delete("/:orderId/items/:itemId", ctrl.removeOrderItem);

export default router;

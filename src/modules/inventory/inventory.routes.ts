import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./inventory.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/stock", 
  // requirePermission("inventory.read"), 
  ctrl.getStockOverview);

router.get("/stock/:designId", // 
  // requirePermission("inventory.read"), 
  ctrl.getStockByDesign);

router.post(
  "/stock/:designId/adjustment",
  // requirePermission("inventory.update"),
  ctrl.createStockAdjustment,
);

router.post("/packaging", 
  // requirePermission("inventory.create"),
   ctrl.createPackagingBatch);

router.get("/packaging", 
  // requirePermission("inventory.read"),
    ctrl.getPackagingBatches);

router.get(
  "/packaging/:batchId",
  // requirePermission("inventory.read"),
  ctrl.getPackagingBatchById,
);

export default router;

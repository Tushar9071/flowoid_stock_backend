import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./supplementary.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);
router.get("/", 
  // requirePermission("supplementary.read"), 
  ctrl.getAllSupplementaryTypes
);
router.get(
  "/:id",
  // requirePermission("supplementary.read"),
  ctrl.getSupplementaryTypeById,
);
router.post(
  "/",
  // requirePermission("supplementary.create"),
  ctrl.createSupplementaryType,
);
router.patch(
  "/:id",
  // requirePermission("supplementary.update"),
  ctrl.updateSupplementaryType,
);
router.delete(
  "/:id",
  // requirePermission("supplementary.delete"),
  ctrl.softDeleteSupplementaryType,
);
router.patch(
  "/:id/stock",
  // requirePermission("supplementary.update"),
  ctrl.adjustStock,
);

export default router;

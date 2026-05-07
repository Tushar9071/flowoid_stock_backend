import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./assignments.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);
router.get(
  "/goods-returns",
  // requirePermission("goods-returns.read"),
  ctrl.getAllGoodsReturns,
);
router.get(
  "/goods-returns/:returnId",
  // requirePermission("goods-returns.read"),
  ctrl.getGoodsReturnById,
);

router.get("/", // requirePermission("assignments.read"),
  ctrl.getAllAssignments
);
router.get("/:id", // requirePermission("assignments.read"),
  ctrl.getAssignmentById
);
router.post("/", // requirePermission("assignments.create"),
  ctrl.createAssignment
);
router.patch("/:id", // requirePermission("assignments.update"),
  ctrl.updateAssignment
);
router.patch(
  "/:id/status",
  // requirePermission("assignments.update"),
  ctrl.updateAssignmentStatus,
);
router.patch("/:id/close", // requirePermission("assignments.delete"),
  ctrl.closeAssignment
);

router.post(
  "/:id/returns",
  // requirePermission("goods-returns.create"),
  ctrl.recordGoodsReturn,
);
router.get("/:id/returns", // requirePermission("goods-returns.read"),
  ctrl.getAssignmentReturns
);

export default router;

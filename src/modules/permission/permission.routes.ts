import { Router } from "express";
import * as ctrl from "./permission.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";

const router: Router = Router();

router.use(requireAuth);

router.post(
  "/",
  requirePermission("permissions.create"),
  ctrl.createPermission,
);
router.get("/", requirePermission("permissions.read"), ctrl.getAllPermissions);
router.get(
  "/:id",
  requirePermission("permissions.read"),
  ctrl.getPermissionById,
);
router.put(
  "/:id",
  requirePermission("permissions.update"),
  ctrl.updatePermission,
);
router.delete(
  "/:id",
  requirePermission("permissions.delete"),
  ctrl.deletePermission,
);

export default router;

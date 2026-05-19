import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { uploadDesignImage } from "../../middleware/upload.middleware";
import * as ctrl from "./designs.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);
router.get(
  "/categories",
  // requirePermission("designs.read"),
  ctrl.getAllCategories,
);
router.get(
  "/categories/:id",
  // requirePermission("designs.read"),
  ctrl.getCategoryById,
);
router.post(
  "/categories",
  // requirePermission("designs.create"),
  ctrl.createCategory,
);
router.patch(
  "/categories/:id",
  // requirePermission("designs.update"),
  ctrl.updateCategory,
);
router.delete(
  "/categories/:id",
  // requirePermission("designs.delete"),
  ctrl.softDeleteCategory,
);

router.get("/", // requirePermission("designs.read"),
  ctrl.getAllDesigns);
router.get("/:id", // requirePermission("designs.read"),
  ctrl.getDesignById);
router.post("/", uploadDesignImage, // requirePermission("designs.create"),
  ctrl.createDesign);
router.patch("/:id", uploadDesignImage, // requirePermission("designs.update"),
  ctrl.updateDesign);
router.patch(
  "/:id/status",
  // requirePermission("designs.update"),
  ctrl.updateDesignStatus,
);
router.delete("/:id", // requirePermission("designs.delete"),
  ctrl.softDeleteDesign);

router.get(
  "/:id/supplementary-needs",
  // requirePermission("designs.read"),
  ctrl.getDesignSupplementaryNeeds,
);
router.post(
  "/:id/supplementary-needs",
  // requirePermission("designs.update"),
  ctrl.addSupplementaryNeed,
);
router.patch(
  "/:id/supplementary-needs/:needId",
  // requirePermission("designs.update"),
  ctrl.updateSupplementaryNeed,
);
router.delete(
  "/:id/supplementary-needs/:needId",
  // requirePermission("designs.delete"),
  ctrl.removeSupplementaryNeed,
);

export default router;

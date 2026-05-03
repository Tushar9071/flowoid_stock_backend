import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./rawMaterial.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

// Material Types
router.get("/types", 
    // requirePermission("raw-materials.read"), 
    ctrl.getAllMaterialTypes);

router.get(
  "/types/:materialTypeId",
//   requirePermission("raw-materials.read"),
  ctrl.getMaterialTypeById,
);
router.post(
  "/types",
//   requirePermission("raw-materials.create"),
  ctrl.createMaterialType,
);
router.patch(
  "/types/:materialTypeId",
//   requirePermission("raw-materials.update"),
  ctrl.updateMaterialType,
);
router.delete(
  "/types/:materialTypeId",
//   requirePermission("raw-materials.delete"),
  ctrl.softDeleteMaterialType,
);

// Purchases
router.get(
  "/purchases",
//   requirePermission("raw-materials.read"),
  ctrl.getAllPurchases,
);
router.get(
  "/purchases/:purchaseId",
//   requirePermission("raw-materials.read"),
  ctrl.getPurchaseById,
);
router.post(
  "/purchases",
//   requirePermission("raw-materials.create"),
  ctrl.createPurchase,
);
router.patch(
  "/purchases/:purchaseId",
//   requirePermission("raw-materials.update"),
  ctrl.updatePurchase,
);
router.delete(
  "/purchases/:purchaseId",
//   requirePermission("raw-materials.delete"),
  ctrl.softDeletePurchase,
);

// Stock
router.get("/stock", 
    // requirePermission("raw-materials.read"), 
    ctrl.getRawMaterialStock);

// Issuances
router.get(
  "/issuances",
//   requirePermission("raw-materials.read"),
  ctrl.getAllIssuances,
);
router.get(
  "/issuances/:issuanceId",
//   requirePermission("raw-materials.read"),
  ctrl.getIssuanceById,
);
router.post(
  "/issuances",
//   requirePermission("raw-materials.create"),
  ctrl.createIssuance,
);

export default router;

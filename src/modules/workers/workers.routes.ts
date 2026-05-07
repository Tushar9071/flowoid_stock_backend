import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./workers.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", 
  // requirePermission("workers.read"),
   ctrl.getAllWorkers
);

router.post("/", 
  // requirePermission("workers.create"),
   ctrl.createWorker
);

router.get("/payments", 
  // requirePermission("workers.read"),
  ctrl.getAllWorkerPayments
);

router.get(
  "/payments/:paymentId",
  // requirePermission("workers.read"),
  ctrl.getWorkerPaymentById,
);

router.post("/payments", 
  // requirePermission("workers.create"),
   ctrl.createWorkerPayment
);

router.get("/:id", 
  // requirePermission("workers.read"),
 ctrl.getWorkerById
);

router.patch("/:id", 
  // requirePermission("workers.update"),
 ctrl.updateWorker
);

router.delete("/:id",
   // requirePermission("workers.delete"),
 ctrl.softDeleteWorker
);
 
router.get(
  "/:id/assignments",
  // requirePermission("workers.read"),
  ctrl.getWorkerAssignments,
);
router.get("/:id/payments", 
  // requirePermission("workers.read"),
  ctrl.getWorkerPayments
);
router.get("/:id/ledger", 
// requirePermission("workers.read"),
  ctrl.getWorkerLedger
);

export default router;

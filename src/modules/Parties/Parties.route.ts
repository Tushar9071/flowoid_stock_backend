import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./Parties.controller";
import { requirePermission } from "../../middleware/permission.middleware";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/", requirePermission("parties.create"), ctrl.createParty);
router.get("/", requirePermission("parties.read"), ctrl.listParties);
router.get(
  "/dropdown",
  requirePermission("parties.read"),
  ctrl.getPartiesDropdown,
);
router.get(
  "/check-duplicate",
  requirePermission("parties.read"),
  ctrl.checkPartyDuplicate,
);
router.get(
  "/:partyId/opening-balance",
  requirePermission("parties.read"),
  ctrl.getOpeningBalance,
);
router.post(
  "/:partyId/opening-balance",
  requirePermission("parties.create"),
  ctrl.createOpeningBalance,
);
router.put(
  "/:partyId/opening-balance",
  requirePermission("parties.update"),
  ctrl.updateOpeningBalance,
);
router.get(
  "/:partyId/statement",
  requirePermission("parties.read"),
  ctrl.getPartyStatement,
);
router.get(
  "/:partyId/ledger",
  requirePermission("parties.read"),
  ctrl.getPartyLedger,
);
router.get("/:partyId", requirePermission("parties.read"), ctrl.getPartyById);
router.put("/:partyId", requirePermission("parties.update"), ctrl.updateParty);
router.patch(
  "/:partyId/status",
  requirePermission("parties.update"),
  ctrl.updatePartyStatus,
);
router.delete(
  "/:partyId",
  requirePermission("parties.delete"),
  ctrl.deleteParty,
);

export default router;

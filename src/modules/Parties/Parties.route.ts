import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./Parties.controller";

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/", ctrl.createParty);
router.get("/", ctrl.listParties);
router.get("/dropdown", ctrl.getPartiesDropdown);
router.get("/check-duplicate", ctrl.checkPartyDuplicate);
router.get("/:partyId/opening-balance", ctrl.getOpeningBalance);
router.post("/:partyId/opening-balance", ctrl.createOpeningBalance);
router.put("/:partyId/opening-balance", ctrl.updateOpeningBalance);
router.get("/:partyId/statement", ctrl.getPartyStatement);
router.get("/:partyId/ledger", ctrl.getPartyLedger);
router.get("/:partyId", ctrl.getPartyById);
router.put("/:partyId", ctrl.updateParty);
router.patch("/:partyId/status", ctrl.updatePartyStatus);
router.delete("/:partyId", ctrl.deleteParty);

export default router;

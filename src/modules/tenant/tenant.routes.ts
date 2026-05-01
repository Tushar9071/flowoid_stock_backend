import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./tenant.controller";

const router: Router = Router();

router.use(requireAuth);

router.post("/", ctrl.createTenant);
router.get("/mine", ctrl.getMyTenants);

export default router;

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./monitoring.controller";
import { requirePermission } from "../../middleware/permission.middleware";

const router: Router = Router();

router.get("/metrics", requireAuth ,requirePermission('metrics.read')  , ctrl.getMetrics);

export default router;

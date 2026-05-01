import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import * as ctrl from "./monitoring.controller";

const router: Router = Router();

router.get("/metrics", requireAuth, ctrl.getMetrics);

export default router;

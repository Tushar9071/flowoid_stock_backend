import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "./admin.guard";
import * as backupController from "./backup.controller";
import * as logsController from "./logs.controller";

const router: Router = Router();

router.use(requireAuth, requireAdmin);

router.get("/logs", logsController.listLogs);
router.get("/logs/stats", logsController.getLogStats);
router.get("/backup/list", backupController.listBackups);
router.post("/backup/trigger", backupController.triggerBackup);
router.get("/backup/status", backupController.getBackupStatus);

export default router;

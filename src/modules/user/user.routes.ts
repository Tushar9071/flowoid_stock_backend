import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import * as ctrl from "./user.controller";

const router: Router = Router();

router.use(requireAuth);

router.post("/", requirePermission("users.create"), ctrl.createUser);
router.get("/", requirePermission("users.read"), ctrl.getUsers);
router.get("/:id", requirePermission("users.read"), ctrl.getUserById);
router.put("/:id", requirePermission("users.update"), ctrl.updateUser);
router.delete("/:id", requirePermission("users.delete"), ctrl.deactivateUser);

export default router;

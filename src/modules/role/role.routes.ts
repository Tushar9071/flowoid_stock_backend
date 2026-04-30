import { Router } from 'express';
import * as ctrl from './role.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';

const router: Router = Router();

router.use(requireAuth);

router.post('/', requirePermission('roles.create'), ctrl.createRole);
router.get('/', requirePermission('roles.read'), ctrl.getAllRoles);
router.get('/:id', requirePermission('roles.read'), ctrl.getRoleById);
router.put('/:id', requirePermission('roles.update'), ctrl.updateRole);
router.delete('/:id', requirePermission('roles.delete'), ctrl.deleteRole);

export default router;

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as ctrl from './auth.controller';

const router: Router = Router();

// Public routes
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);

// Protected routes (require Bearer token)
router.post('/logout', requireAuth, ctrl.logout);
router.get('/me', requireAuth, ctrl.getMe);
router.get('/my-permissions', requireAuth, ctrl.getMyPermissions);
router.post('/change-password', requireAuth, ctrl.changePassword);

export default router;

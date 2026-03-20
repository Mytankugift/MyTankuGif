import { Router } from 'express';
import { SystemAdminController } from './system-admin.controller';
import { AdminCronController } from './admin-cron.controller';
import { authenticateAdmin } from '../admin/admin-auth/admin-auth.middleware';

const router = Router();
const systemAdminController = new SystemAdminController();
const adminCronController = new AdminCronController();

/**
 * GET /api/v1/admin/system/proxy/status
 * Verificar estado del proxy (nginx)
 */
router.get('/proxy/status', systemAdminController.getProxyStatus);

/** Cron / notificaciones — requiere JWT admin */
router.get('/cron/status', authenticateAdmin, adminCronController.getCronStatus);
router.post(
  '/cron/event-reminders/run',
  authenticateAdmin,
  adminCronController.runEventReminders
);
router.post(
  '/notifications/test',
  authenticateAdmin,
  adminCronController.postTestNotification
);

export default router;


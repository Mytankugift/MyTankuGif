import { Router } from 'express';
import { SystemAdminController } from './system-admin.controller';
import { AdminCronController } from './admin-cron.controller';
import { AdminEmailController } from './admin-email.controller';
import { authenticateAdmin } from '../admin/admin-auth/admin-auth.middleware';

const router = Router();
const systemAdminController = new SystemAdminController();
const adminCronController = new AdminCronController();
const adminEmailController = new AdminEmailController();

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
router.patch(
  '/cron/dropi-sync-stock/config',
  authenticateAdmin,
  adminCronController.patchDropiSyncStockConfig
);
router.post(
  '/cron/dropi-sync-stock/run',
  authenticateAdmin,
  adminCronController.runDropiSyncStock
);
router.post(
  '/notifications/test',
  authenticateAdmin,
  adminCronController.postTestNotification
);

/** Vista previa HTML correo regalo (no envía correo) */
router.post(
  '/email/gift-preview/render',
  authenticateAdmin,
  adminEmailController.postGiftPreviewRender
);

/** Envía correo de prueba plantilla regalo */
router.post('/email/gift-preview', authenticateAdmin, adminEmailController.postGiftPreview);

export default router;

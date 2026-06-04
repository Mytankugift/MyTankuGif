import { Router } from 'express';
import { SystemAdminController } from './system-admin.controller';
import { AdminCronController } from './admin-cron.controller';
import { AdminEmailController } from './admin-email.controller';
import { AdminSupportCasesConfigController } from './admin-support-cases-config.controller';
import { authenticateAdmin } from '../admin/admin-auth/admin-auth.middleware';

const router = Router();
const systemAdminController = new SystemAdminController();
const adminCronController = new AdminCronController();
const adminEmailController = new AdminEmailController();
const adminSupportCasesConfigController = new AdminSupportCasesConfigController();

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
  '/cron/support-case-evidence-retention/run',
  authenticateAdmin,
  adminCronController.runSupportCaseEvidenceRetention
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

/** Configuración módulo postventa */
router.get(
  '/support-cases/config',
  authenticateAdmin,
  adminSupportCasesConfigController.getConfig
);
router.patch(
  '/support-cases/config',
  authenticateAdmin,
  adminSupportCasesConfigController.patchConfig
);

export default router;

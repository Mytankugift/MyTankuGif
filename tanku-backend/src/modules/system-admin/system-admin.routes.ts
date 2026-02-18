import { Router } from 'express';
import { SystemAdminController } from './system-admin.controller';

const router = Router();
const systemAdminController = new SystemAdminController();

/**
 * GET /api/v1/admin/system/proxy/status
 * Verificar estado del proxy (nginx)
 */
router.get('/proxy/status', systemAdminController.getProxyStatus);

export default router;


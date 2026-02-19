import { Router } from 'express';
import { AdminAuthController } from './admin-auth.controller';
import { authenticateAdmin } from './admin-auth.middleware';

const router = Router();
const adminAuthController = new AdminAuthController();

/**
 * POST /api/v1/admin/auth/login
 * Iniciar sesión como admin
 */
router.post('/login', adminAuthController.login);

/**
 * GET /api/v1/admin/auth/me
 * Obtener admin user actual autenticado
 */
router.get('/me', authenticateAdmin, adminAuthController.me);

export default router;


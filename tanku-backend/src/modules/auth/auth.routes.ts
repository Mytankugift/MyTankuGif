import { Router } from 'express';
import { AuthController } from './auth.controller';
import { GoogleAuthController } from './google-auth.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const authController = new AuthController();
const googleAuthController = new GoogleAuthController();

/**
 * POST /api/v1/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', authController.register);

/**
 * POST /api/v1/auth/login
 * Iniciar sesión
 */
router.post('/login', authController.login);

/**
 * POST /api/v1/auth/refresh
 * Refrescar token de acceso
 */
router.post('/refresh', authController.refresh);

/**
 * GET /api/v1/auth/me
 * Obtener usuario actual autenticado
 */
router.get('/me', authenticate, authController.me);

/**
 * GET /api/v1/auth/google
 * Inicia el flujo de autenticación con Google
 */
router.get('/google', googleAuthController.initiate);

/**
 * GET /api/v1/auth/google/callback
 * Callback de Google OAuth (redirige al frontend)
 */
router.get('/google/callback', googleAuthController.callback);

/**
 * POST /api/v1/auth/google/callback
 * Callback de Google OAuth para el frontend (compatibilidad con Medusa)
 * Esta ruta acepta POST con código en el body (diferente al GET que redirige)
 */
router.post('/google/callback', googleAuthController.customerCallback);

/**
 * POST /api/v1/auth/google/complete
 * Completa la autenticación de Google (para compatibilidad)
 */
router.post('/google/complete', googleAuthController.complete);

export default router;

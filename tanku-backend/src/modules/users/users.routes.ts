import { Router } from 'express';
import { UsersController } from './users.controller';
import { uploadAvatar, uploadBanner } from '../../shared/middleware/upload.middleware';

const router = Router();
const usersController = new UsersController();

/**
 * GET /personal-info/get-info?customer_id=...
 * Obtener información personal completa
 */
router.get('/get-info', usersController.getPersonalInfo);

/**
 * POST /personal-info/update-pseudonym
 * Actualizar seudónimo
 */
router.post('/update-pseudonym', usersController.updatePseudonym);

/**
 * POST /personal-info/update-status
 * Actualizar mensaje de estado
 */
router.post('/update-status', usersController.updateStatusMessage);

/**
 * POST /personal-info/update-avatar
 * Actualizar avatar (con upload de archivo)
 */
router.post('/update-avatar', uploadAvatar, usersController.updateAvatar);

/**
 * POST /personal-info/update-banner
 * Actualizar banner (con upload de archivo)
 */
router.post('/update-banner', uploadBanner, usersController.updateBanner);

export default router;

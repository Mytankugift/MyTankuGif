import { Router } from 'express';
import { ProductOverrideController } from './product-override.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';

const router = Router();
const productOverrideController = new ProductOverrideController();

// Todas las rutas requieren autenticación
router.use(authenticateAdmin);

// Rutas
router.post('/:id/lock', productOverrideController.lockProduct);
router.post('/:id/unlock', productOverrideController.unlockProduct);
router.get('/:id/lock-info', productOverrideController.getLockInfo);

export default router;



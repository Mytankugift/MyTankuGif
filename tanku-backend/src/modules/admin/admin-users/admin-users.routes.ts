import { Router } from 'express';
import { AdminUserController } from './admin-users.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';

const router = Router();
const adminUserController = new AdminUserController();

// Todas las rutas requieren autenticación
router.use(authenticateAdmin);

// Rutas
router.get('/', adminUserController.listUsers);
router.get('/:id', adminUserController.getUserById);
router.post('/', adminUserController.createUser);
router.patch('/:id', adminUserController.updateUser);
router.delete('/:id', adminUserController.deleteUser);

export default router;


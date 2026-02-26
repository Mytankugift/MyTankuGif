import { Router } from 'express';
import { AdminCategoryController } from './admin-categories.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';
import { upload } from '../../../shared/middleware/upload.middleware';

const router = Router();
const adminCategoryController = new AdminCategoryController();

// Todas las rutas requieren autenticación
router.use(authenticateAdmin);

// Rutas de categorías
router.get('/', adminCategoryController.getCategories);
router.get('/:id', adminCategoryController.getCategoryById);
router.post('/', adminCategoryController.createCategory);
router.patch('/:id', adminCategoryController.updateCategory);
router.delete('/:id', adminCategoryController.deleteCategory);

// Rutas de bloqueo
router.patch('/:id/block', adminCategoryController.toggleBlock);

// Rutas de imagen
router.post('/:id/image', upload.single('image'), adminCategoryController.uploadImage);
router.delete('/:id/image', adminCategoryController.removeImage);

// Rutas de fórmula por defecto
router.patch('/:id/default-formula', adminCategoryController.setDefaultPriceFormula);

export default router;


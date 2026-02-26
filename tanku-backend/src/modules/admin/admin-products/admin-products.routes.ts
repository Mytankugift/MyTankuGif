import { Router } from 'express';
import { AdminProductController } from './admin-products.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';
import productOverrideRoutes from '../admin-override/product-override.routes';
import { upload } from '../../../shared/middleware/upload.middleware';

const router = Router();
const adminProductController = new AdminProductController();

// Todas las rutas requieren autenticación
router.use(authenticateAdmin);

// Rutas de operaciones masivas - DEBEN IR ANTES de las rutas con parámetros dinámicos
router.post('/bulk/update-category', adminProductController.bulkUpdateCategory);
router.post('/bulk/apply-price-formula', adminProductController.bulkApplyPriceFormula);
router.post('/bulk/toggle-active', adminProductController.bulkToggleActive);
router.post('/bulk/toggle-lock', adminProductController.bulkToggleLock);

// Rutas de productos
router.get('/', adminProductController.getProducts);
router.get('/:id', adminProductController.getProductById);
router.patch('/:id', adminProductController.updateProduct);
router.patch('/:id/toggle-active', adminProductController.toggleProductActive);
router.patch('/:id/reorder-images', adminProductController.reorderImages);
router.patch('/:productId/variants/:variantId/title', adminProductController.updateVariantTitle);

// Rutas de gestión de imágenes
router.post('/:id/images', upload.single('image'), adminProductController.uploadImage);
router.delete('/:id/images', adminProductController.deleteImage);
router.patch('/:id/images/hide', adminProductController.hideImage);
router.patch('/:id/images/show', adminProductController.showImage);

// Rutas de fórmulas de precio
router.post('/:id/apply-price-formula', adminProductController.applyPriceFormula);

// Rutas de override (bloqueo) - deben ir después de las rutas específicas
router.use('/', productOverrideRoutes);

export default router;


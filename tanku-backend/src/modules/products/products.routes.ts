import { Router } from 'express';
import { ProductsController } from './products.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const productsController = new ProductsController();

/**
 * GET /api/v1/products
 * Listar productos con paginación, filtros y ordenamiento
 * Query params: page, limit, category, priceMin, priceMax, active, search, sortBy, sortOrder
 */
router.get('/', productsController.listProductsNormalized);

/**
 * GET /api/v1/products/top
 * Obtener top productos para StalkerGift (usuarios externos)
 * Query params: limit (default: 50)
 */
router.get('/top', productsController.getTopProducts);

/**
 * GET /api/v1/products/liked
 * Obtener productos que le gustan al usuario actual
 * Query params: limit, offset
 */
router.get('/liked', authenticate, productsController.getLikedProducts);

/**
 * POST /api/v1/products/:productId/like
 * Dar like a un producto
 */
router.post('/:productId/like', authenticate, productsController.likeProduct);

/**
 * DELETE /api/v1/products/:productId/like
 * Quitar like de un producto
 */
router.delete('/:productId/like', authenticate, productsController.unlikeProduct);

/**
 * GET /api/v1/products/:productId/likes
 * Obtener contador de likes de un producto
 */
router.get('/:productId/likes', productsController.getProductLikesCount);

/**
 * GET /api/v1/products/:productId/liked
 * Verificar si el usuario actual le dio like a un producto
 */
router.get('/:productId/liked', authenticate, productsController.isProductLiked);

/**
 * GET /api/v1/products/variant/:variantId
 * Obtener información de una variante por su ID
 * IMPORTANTE: Esta ruta debe ir antes de /:handle para evitar conflictos
 */
router.get('/variant/:variantId', productsController.getVariantById);

/**
 * GET /api/v1/products/:handle
 * Obtener producto por handle
 * IMPORTANTE: Esta ruta debe ir al final para evitar conflictos con /:productId/like
 */
router.get('/:handle', productsController.getProductByHandleNormalized);

export default router;


import { Router } from 'express';
import { ProductsController } from './products.controller';

const router = Router();
const productsController = new ProductsController();

/**
 * GET /api/v1/products
 * Listar productos con paginación, filtros y ordenamiento
 * Query params: page, limit, category, priceMin, priceMax, active, search, sortBy, sortOrder
 */
router.get('/', productsController.listProductsNormalized);

/**
 * GET /api/v1/products/:handle
 * Obtener producto por handle
 */
router.get('/:handle', productsController.getProductByHandleNormalized);

export default router;


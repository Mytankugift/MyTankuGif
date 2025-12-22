import { Router } from 'express';
import { ProductsController } from './products.controller';

const router = Router();
const productsController = new ProductsController();

/**
 * GET /store/product/
 * GET /api/v1/store/product/
 * Listar productos (compatibilidad con frontend)
 * Query params: limit, offset, category_id
 */
router.get('/', productsController.listProducts);

/**
 * GET /store/product/tanku/:handle
 * Obtener producto por handle
 */
router.get('/tanku/:handle', productsController.getProductByHandle);

export default router;

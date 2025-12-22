import { Router } from 'express';
import { StoreController } from './store.controller';
import { ProductsController } from '../products/products.controller';
import productsRoutes from '../products/products.routes';

const router = Router();
const storeController = new StoreController();
const productsController = new ProductsController();

/**
 * GET /api/v1/store/regions
 * GET /store/regions
 * Obtener regiones disponibles
 */
router.get('/regions', storeController.getRegions);

/**
 * GET /store/regions/:id
 * Obtener una región específica por ID
 */
router.get('/regions/:id', storeController.getRegionById);

/**
 * GET /api/v1/store/categories
 * GET /store/categories
 * Obtener categorías de productos
 */
router.get('/categories', storeController.getCategories);

/**
 * GET /api/v1/store/products
 * Obtener productos (SDK de Medusa)
 */
router.get('/products', productsController.listProductsSDK);

/**
 * Rutas de productos
 * /store/product/* - Compatibilidad con frontend
 */
router.use('/product', productsRoutes);

export default router;

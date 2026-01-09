import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const cartController = new CartController();

/**
 * GET /api/v1/cart
 * Obtener o crear carrito (funciona sin autenticación - carrito guest)
 */
router.get('/', optionalAuthenticate, cartController.getCurrentUserCart);

/**
 * POST /api/v1/cart
 * Crear carrito nuevo
 */
router.post('/', optionalAuthenticate, cartController.createCartNormalized);

/**
 * POST /api/v1/cart/items
 * Agregar item al carrito
 */
router.post('/items', optionalAuthenticate, cartController.addItemNormalized);

/**
 * PUT /api/v1/cart/items/:itemId
 * Actualizar cantidad de item
 */
router.put('/items/:itemId', optionalAuthenticate, cartController.updateItemNormalized);

/**
 * DELETE /api/v1/cart/items/:itemId
 * Eliminar item del carrito
 */
router.delete('/items/:itemId', optionalAuthenticate, cartController.deleteItemNormalized);

export default router;


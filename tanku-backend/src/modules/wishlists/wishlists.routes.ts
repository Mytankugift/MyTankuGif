import { Router } from 'express';
import { WishListsController } from './wishlists.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const wishListsController = new WishListsController();

/**
 * GET /api/v1/wishlists
 * Obtener wish lists del usuario autenticado
 */
router.get('/', authenticate, wishListsController.getUserWishLists);

/**
 * POST /api/v1/wishlists
 * Crear nueva wish list
 */
router.post('/', authenticate, wishListsController.createWishList);

/**
 * PUT /api/v1/wishlists/:id
 * Actualizar wish list
 */
router.put('/:id', authenticate, wishListsController.updateWishList);

/**
 * DELETE /api/v1/wishlists/:id
 * Eliminar wish list
 */
router.delete('/:id', authenticate, wishListsController.deleteWishList);

/**
 * POST /api/v1/wishlists/:id/items
 * Agregar producto a wish list
 */
router.post('/:id/items', authenticate, wishListsController.addItemToWishList);

/**
 * DELETE /api/v1/wishlists/:id/items/:itemId
 * Remover producto de wish list
 */
router.delete('/:id/items/:itemId', authenticate, wishListsController.removeItemFromWishList);

/**
 * GET /api/v1/wishlists/:userId
 * Obtener wish lists de un usuario específico (para wishlists públicas)
 * IMPORTANTE: Esta ruta debe ir al final para evitar conflictos con /:id
 */
router.get('/:userId', wishListsController.getWishListsByUserId);

export default router;


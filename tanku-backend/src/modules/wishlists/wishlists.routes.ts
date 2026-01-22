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
 * POST /api/v1/wishlists/:id/save
 * Guardar wishlist de otro usuario
 */
router.post('/:id/save', authenticate, wishListsController.saveWishlist);

/**
 * DELETE /api/v1/wishlists/:id/save
 * Desguardar wishlist
 */
router.delete('/:id/save', authenticate, wishListsController.unsaveWishlist);

/**
 * POST /api/v1/wishlists/:id/share-token
 * Generar token de compartir para wishlist
 */
router.post('/:id/share-token', authenticate, wishListsController.generateShareToken);

/**
 * GET /api/v1/wishlists/saved
 * Obtener wishlists guardadas del usuario autenticado
 */
router.get('/saved', authenticate, wishListsController.getSavedWishlists);

/**
 * GET /api/v1/wishlists/share/:token
 * GET /api/v1/wishlists/share/:username/:slug-:id
 * Obtener wishlist por token de compartir o por URL SEO (público)
 * IMPORTANTE: Esta ruta debe ir antes de /:userId para evitar conflictos
 */
router.get('/share/:token', wishListsController.getWishlistByShareToken);
router.get('/share/:username/:slug', wishListsController.getWishlistByShareToken);

/**
 * GET /api/v1/wishlists/:userId
 * Obtener wish lists de un usuario específico (considerando privacidad y amistad)
 * IMPORTANTE: Esta ruta debe ir al final para evitar conflictos con /:id
 */
router.get('/:userId', wishListsController.getWishListsByUserId);

export default router;


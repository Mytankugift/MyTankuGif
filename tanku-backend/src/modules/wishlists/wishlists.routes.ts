import { Router } from 'express';
import { WishListsController } from './wishlists.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/auth.middleware';

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
 * POST /api/v1/wishlists/:wishlistId/request-access
 * Solicitar acceso a una wishlist privada
 */
router.post('/:wishlistId/request-access', authenticate, wishListsController.requestAccess);

/**
 * DELETE /api/v1/wishlists/:wishlistId/request-access
 * Cancelar una solicitud de acceso pendiente
 */
router.delete('/:wishlistId/request-access', authenticate, wishListsController.cancelAccessRequest);

/**
 * PUT /api/v1/wishlists/access-requests/:requestId/approve
 * Aprobar solicitud de acceso
 */
router.put('/access-requests/:requestId/approve', authenticate, wishListsController.approveAccessRequest);

/**
 * PUT /api/v1/wishlists/access-requests/:requestId/reject
 * Rechazar solicitud de acceso
 */
router.put('/access-requests/:requestId/reject', authenticate, wishListsController.rejectAccessRequest);

/**
 * GET /api/v1/wishlists/saved
 * Obtener wishlists guardadas del usuario autenticado
 */
router.get('/saved', authenticate, wishListsController.getSavedWishlists);

/**
 * GET /api/v1/wishlists/liked
 * Obtener wishlist automática "Me gusta" del usuario autenticado
 */
router.get('/liked', authenticate, wishListsController.getLikedWishlist);

/**
 * GET /api/v1/wishlists/recommended
 * Obtener wishlists recomendadas (plantillas)
 */
router.get('/recommended', authenticate, wishListsController.getRecommendedWishlists);

/**
 * GET /api/v1/wishlists/access-requests
 * Obtener solicitudes de acceso pendientes para las wishlists del usuario
 */
router.get('/access-requests', authenticate, wishListsController.getAccessRequests);

/**
 * GET /api/v1/wishlists/pending-requests
 * Obtener IDs de wishlists para las que el usuario tiene solicitudes pendientes
 */
router.get('/pending-requests', authenticate, wishListsController.getPendingRequests);

/**
 * GET /api/v1/wishlists/share/:token
 * GET /api/v1/wishlists/share/:username/:slug-:id
 * Obtener wishlist por token de compartir o por URL SEO (público)
 * IMPORTANTE: Esta ruta debe ir antes de /:userId para evitar conflictos
 */
router.get('/share/:token', wishListsController.getWishlistByShareToken);
router.get('/share/:username/:slug', wishListsController.getWishlistByShareToken);

/**
 * GET /api/v1/wishlists/:wishlistId/access-grants
 * Obtener usuarios con acceso aprobado a una wishlist
 */
router.get('/:wishlistId/access-grants', authenticate, wishListsController.getWishlistAccessGrants);

/**
 * DELETE /api/v1/wishlists/:wishlistId/access-grants
 * Revocar todos los accesos a una wishlist
 */
router.delete('/:wishlistId/access-grants', authenticate, wishListsController.revokeAllWishlistAccess);

/**
 * DELETE /api/v1/wishlists/:wishlistId/access-grants/:userId
 * Revocar acceso de un usuario específico a una wishlist
 */
router.delete('/:wishlistId/access-grants/:userId', authenticate, wishListsController.revokeWishlistAccess);

/**
 * GET /api/v1/wishlists/:userId
 * Obtener wish lists de un usuario específico (considerando privacidad y amistad)
 * IMPORTANTE: Esta ruta debe ir al final para evitar conflictos con /:id
 * Autenticación opcional: si el usuario está autenticado, se consideran accesos aprobados
 */
router.get('/:userId', optionalAuthenticate, wishListsController.getWishListsByUserId);

export default router;


import { Router } from 'express';
import { FeedController } from './feed.controller';
import { optionalAuthenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const feedController = new FeedController();

/**
 * GET /api/v1/feed/init
 * Endpoint batch para inicialización del feed
 * Retorna todos los datos necesarios para cargar el feed en una sola petición
 * 
 * Retorna:
 * - feed: FeedResponseDTO
 * - categories: CategoryDTO[]
 * - cart: CartDTO | null
 * - stories: StoryDTO[]
 * - conversations: ConversationWithParticipants[]
 * - unreadCounts: { chat: number, notifications: number }
 * - notifications: NotificationDTO[]
 * - user: UserPublicDTO | null
 * 
 * Autenticación: Opcional (algunos datos solo se retornan si está autenticado)
 */
router.get('/init', optionalAuthenticate, feedController.getFeedInit);

/**
 * GET /api/v1/feed
 * Obtener feed combinado (productos + posters) con cursor-based pagination
 * 
 * Intercala productos (por ranking) y posts (por fecha):
 * - Productos: ordenados por relevancia (globalScore)
 * - Posts: ordenados por fecha (más recientes primero)
 * - Intercalación: cada 5 productos, 1 post (hardcodeado)
 * - Limit: 20 items por página (hardcodeado)
 * 
 * Headers:
 * - X-Feed-Cursor: Token del cursor para siguiente página (opcional)
 * 
 * Autenticación: Opcional (para aplicar boost personalizado si está logueado)
 */
router.get('/', optionalAuthenticate, feedController.getFeed);

/**
 * GET /api/v1/feed/public
 * Obtener feed público (solo productos, sin posters, sin autenticación)
 * 
 * Características:
 * - Solo productos del ranking global
 * - Máximo 100 productos
 * - Sin boost personalizado
 * - Cacheable (60 segundos TTL)
 * - Sin información sensible (no incluye isLiked)
 * 
 * Headers:
 * - X-Feed-Cursor: Token del cursor para paginación (opcional)
 * 
 * Query params:
 * - categoryId: ID de categoría para filtrar (opcional)
 * - search: Query de búsqueda para filtrar productos (opcional)
 * 
 * Autenticación: No requerida
 */
router.get('/public', feedController.getPublicFeed);

export default router;


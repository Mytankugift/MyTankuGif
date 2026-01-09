import { Router } from 'express';
import { FeedController } from './feed.controller';
import { optionalAuthenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const feedController = new FeedController();

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

export default router;


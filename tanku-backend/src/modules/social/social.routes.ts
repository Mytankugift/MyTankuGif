import { Router } from 'express';
import { SocialController } from './social.controller';
import { uploadFiles } from '../../shared/middleware/upload.middleware';

const router = Router();
const socialController = new SocialController();

/**
 * GET /social/posters/get-feed-poster
 * Obtener feed de posters (posts del usuario y sus amigos)
 * Query params: customer_id
 */
router.get('/posters/get-feed-poster', socialController.getFeedPoster);

/**
 * POST /social/posters/create-poster
 * Crear un nuevo poster (post)
 * Body: FormData con customer_id, title, description, files
 */
router.post('/posters/create-poster', uploadFiles, socialController.createPoster);

/**
 * POST /social/stories/create-story
 * Crear una nueva story
 * Body: FormData con customer_id, title, description, timestamp, files
 */
router.post('/stories/create-story', uploadFiles, socialController.createStory);

/**
 * GET /social/posters/get-posters
 * Obtener posters de un usuario específico (para el perfil)
 * Query params: customer_id
 */
router.get('/posters/get-posters', socialController.getPosters);

/**
 * GET /social/stories/get-stories
 * Obtener stories del usuario y sus amigos
 * Query params: customer_id
 */
router.get('/stories/get-stories', socialController.getStories);

export default router;

import { Router } from 'express';
import { StoriesController } from './stories.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/auth.middleware';
import { uploadFiles } from '../../shared/middleware/upload.middleware';

const router = Router();
const storiesController = new StoriesController();

/**
 * GET /api/v1/stories
 * Obtener feed de stories del usuario autenticado
 */
router.get('/', authenticate, storiesController.getFeed);

/**
 * GET /api/v1/stories/user/:userId
 * Obtener stories de un usuario específico
 */
router.get('/user/:userId', optionalAuthenticate, storiesController.getByUserId);

/**
 * POST /api/v1/stories
 * Crear una nueva story
 */
router.post('/', authenticate, uploadFiles, storiesController.create);

/**
 * GET /api/v1/stories/wishlist
 * Obtener solo historias de wishlist
 */
router.get('/wishlist', optionalAuthenticate, storiesController.getWishlistStories);

/**
 * POST /api/v1/stories/wishlist
 * Crear historia de wishlist (automático)
 */
router.post('/wishlist', authenticate, storiesController.createWishlistStory);

export default router;


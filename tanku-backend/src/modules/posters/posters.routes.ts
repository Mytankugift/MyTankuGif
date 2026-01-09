import { Router } from 'express';
import { PostersController } from './posters.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/auth.middleware';
import { uploadFiles } from '../../shared/middleware/upload.middleware';

const router = Router();
const postersController = new PostersController();

/**
 * GET /api/v1/posters
 * Obtener feed de posters del usuario autenticado
 */
router.get('/', authenticate, postersController.getFeed);

/**
 * GET /api/v1/posters/user/:userId
 * Obtener posters de un usuario específico
 */
router.get('/user/:userId', optionalAuthenticate, postersController.getByUserId);

/**
 * GET /api/v1/posters/:posterId
 * Obtener un poster específico por ID
 */
router.get('/:posterId', optionalAuthenticate, postersController.getById);

/**
 * POST /api/v1/posters
 * Crear un nuevo poster
 */
router.post('/', authenticate, uploadFiles, postersController.create);

/**
 * POST /api/v1/posters/:posterId/reactions
 * Reaccionar a un poster (like/unlike)
 */
router.post('/:posterId/reactions', authenticate, postersController.toggleReaction);

/**
 * POST /api/v1/posters/:posterId/comments
 * Comentar en un poster
 */
router.post('/:posterId/comments', authenticate, postersController.createComment);

export default router;


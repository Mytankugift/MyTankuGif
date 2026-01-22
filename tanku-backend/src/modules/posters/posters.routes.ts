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
 * Query: ?comments=true para incluir comentarios
 */
router.get('/:posterId', optionalAuthenticate, postersController.getById);

/**
 * GET /api/v1/posters/:posterId/comments
 * Obtener comentarios de un poster (paginados)
 * Query: ?page=0&limit=20
 */
router.get('/:posterId/comments', optionalAuthenticate, postersController.getComments);

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

/**
 * POST /api/v1/posters/:posterId/comments/:commentId/like
 * Dar like/unlike a un comentario
 */
router.post('/:posterId/comments/:commentId/like', authenticate, postersController.toggleCommentLike);

/**
 * DELETE /api/v1/posters/:posterId
 * Eliminar un poster (solo el dueño)
 */
router.delete('/:posterId', authenticate, postersController.delete);

export default router;


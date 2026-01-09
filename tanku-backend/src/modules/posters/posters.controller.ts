import { Request, Response, NextFunction } from 'express';
import { PostersService } from './posters.service';
import { S3Service } from '../../shared/services/s3.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';

export class PostersController {
  private postersService: PostersService;
  private s3Service: S3Service;

  constructor() {
    this.postersService = new PostersService();
    this.s3Service = new S3Service();
  }

  /**
   * GET /api/v1/posters
   * Obtener feed de posters del usuario autenticado
   * 
   * Query params:
   * - sort: 'date' (por fecha, default) o 'popular' (por ranking/relevancia)
   */
  getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const sort = (req.query.sort as 'date' | 'popular') || 'date';
      const posters = await this.postersService.getFeedPoster(requestWithUser.user.id, sort);

      res.status(200).json(successResponse(posters));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/posters/user/:userId
   * Obtener posters de un usuario específico
   */
  getByUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'userId es requerido'));
      }

      const posters = await this.postersService.getPostersByUserId(userId);

      res.status(200).json(successResponse(posters));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/posters/:posterId
   * Obtener un poster específico por ID
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { posterId } = req.params;

      if (!posterId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'posterId es requerido'));
      }

      const poster = await this.postersService.getPosterById(posterId);

      res.status(200).json(successResponse(poster));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/posters
   * Crear un nuevo poster
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { title, description } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      // Validar que al menos haya título o descripción
      if (!title?.trim() && !description?.trim()) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'Se requiere al menos un título o descripción'));
      }

      let imageUrl = '';
      let videoUrl = '';

      // Procesar archivos si existen
      if (files.length > 0) {
        for (const file of files) {
          try {
            const fileUrl = await this.s3Service.uploadFile(file, 'posters');
            
            if (file.mimetype.startsWith('image/')) {
              imageUrl = fileUrl;
            } else if (file.mimetype.startsWith('video/')) {
              videoUrl = fileUrl;
            }
          } catch (uploadError: any) {
            console.error(`❌ [POSTERS] Error subiendo archivo:`, uploadError);
            return res.status(500).json(errorResponse(ErrorCode.INTERNAL_ERROR, 'Error al subir archivo'));
          }
        }
      }

      // Validar que haya al menos una imagen o video
      if (!imageUrl && !videoUrl) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'Se requiere al menos una imagen o video'));
      }

      const poster = await this.postersService.createPoster({
        userId: requestWithUser.user.id,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
      });

      res.status(201).json(successResponse(poster));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/posters/:posterId/reactions
   * Reaccionar a un poster (like/unlike)
   */
  toggleReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { posterId } = req.params;
      const { reactionType } = req.body;

      const result = await this.postersService.toggleReaction(
        posterId,
        requestWithUser.user.id,
        reactionType || 'like'
      );

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/posters/:posterId/comments
   * Comentar en un poster
   */
  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { posterId } = req.params;
      const { content, parentId } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'content es requerido'));
      }

      const comment = await this.postersService.createComment(
        posterId,
        requestWithUser.user.id,
        content.trim(),
        parentId
      );

      res.status(201).json(successResponse(comment));
    } catch (error) {
      next(error);
    }
  };
}


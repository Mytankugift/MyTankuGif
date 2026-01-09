import { Request, Response, NextFunction } from 'express';
import { StoriesService } from './stories.service';
import { S3Service } from '../../shared/services/s3.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';

export class StoriesController {
  private storiesService: StoriesService;
  private s3Service: S3Service;

  constructor() {
    this.storiesService = new StoriesService();
    this.s3Service = new S3Service();
  }

  /**
   * GET /api/v1/stories
   * Obtener feed de stories del usuario autenticado
   */
  getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const stories = await this.storiesService.getStoriesByUserId(requestWithUser.user.id);

      res.status(200).json(successResponse(stories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/stories/user/:userId
   * Obtener stories de un usuario específico
   */
  getByUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'userId es requerido'));
      }

      const stories = await this.storiesService.getStoriesByUserId(userId);

      res.status(200).json(successResponse(stories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/stories
   * Crear una nueva story
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { title, description } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      if (!files || files.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'Se requiere al menos un archivo para la story'));
      }

      // Subir archivos a S3
      const uploadedFiles = await Promise.all(
        files.map(async (file, index) => {
          const fileUrl = await this.s3Service.uploadFile(file, 'stories');
          return {
            file_url: fileUrl,
            file_type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            file_size: file.size,
            order_index: index,
          };
        })
      );

      // Crear la story
      const story = await this.storiesService.createStory({
        userId: requestWithUser.user.id,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        files: uploadedFiles,
      });

      res.status(201).json(successResponse(story));
    } catch (error) {
      next(error);
    }
  };
}


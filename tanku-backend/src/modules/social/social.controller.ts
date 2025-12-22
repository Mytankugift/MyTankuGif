import { Request, Response, NextFunction } from 'express';
import { SocialService } from './social.service';
import { S3Service } from '../../shared/services/s3.service';

export class SocialController {
  private socialService: SocialService;
  private s3Service: S3Service;

  constructor() {
    this.socialService = new SocialService();
    this.s3Service = new S3Service();
  }

  /**
   * GET /social/posters/get-feed-poster
   * Obtener feed de posters (posts del usuario y sus amigos)
   * Query params: customer_id
   */
  getFeedPoster = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customer_id } = req.query;

      if (!customer_id || typeof customer_id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'customer_id es requerido',
        });
      }

      console.log(`📱 [SOCIAL] Obteniendo feed de posters para usuario: ${customer_id}`);

      const posterFeed = await this.socialService.getFeedPoster(customer_id);

      console.log(`✅ [SOCIAL] Feed obtenido: ${posterFeed.length} posters`);

      res.status(200).json({
        success: true,
        posterFeed,
      });
    } catch (error) {
      console.error(`❌ [SOCIAL] Error obteniendo feed:`, error);
      next(error);
    }
  };

  /**
   * POST /social/posters/create-poster
   * Crear un nuevo poster (post)
   * Body: FormData con customer_id, title, description, files (imagen/video)
   */
  createPoster = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`📱 [SOCIAL] ========== CREAR POSTER ==========`);
      console.log(`📱 [SOCIAL] Body:`, req.body);
      console.log(`📱 [SOCIAL] Files:`, req.files ? (Array.isArray(req.files) ? req.files.length : 1) : 0);

      const { customer_id, title, description } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          error: 'customer_id es requerido',
        });
      }

      // Validar que al menos haya título o descripción
      if (!title?.trim() && !description?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere al menos un título o descripción',
        });
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
            console.error(`❌ [SOCIAL] Error subiendo archivo:`, uploadError);
            return res.status(500).json({
              success: false,
              error: 'Error al subir archivo',
            });
          }
        }
      }

      // Validar que haya al menos una imagen o video
      if (!imageUrl && !videoUrl) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere al menos una imagen o video',
        });
      }

      const poster = await this.socialService.createPoster({
        customerId: customer_id,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
      });

      console.log(`✅ [SOCIAL] Poster creado: ${poster.id}`);
      console.log(`📱 [SOCIAL] =================================`);

      res.status(201).json({
        success: true,
        poster: {
          id: poster.id,
          title: poster.title,
          description: poster.description,
          image_url: poster.imageUrl,
          video_url: poster.videoUrl,
          created_at: poster.createdAt,
        },
      });
    } catch (error: any) {
      console.error(`❌ [SOCIAL] Error creando poster:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
      });
    }
  };

  /**
   * POST /social/stories/create-story
   * Crear una nueva story
   * Body: FormData con customer_id, title, description, timestamp, files
   */
  createStory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`📱 [SOCIAL] ========== CREAR STORY ==========`);
      console.log(`📱 [SOCIAL] Body:`, req.body);
      console.log(`📱 [SOCIAL] Files:`, req.files ? (Array.isArray(req.files) ? req.files.length : 1) : 0);

      const { customer_id, title, description, timestamp } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          error: 'customer_id es requerido',
        });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere al menos un archivo para la story',
        });
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
      const { story, storyFiles } = await this.socialService.createStory({
        customerId: customer_id,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        files: uploadedFiles,
      });

      console.log(`✅ [SOCIAL] Story creada: ${story.id}`);
      console.log(`📱 [SOCIAL] =================================`);

      res.status(201).json({
        success: true,
        story: {
          id: story.id,
          title: story.title,
          description: story.description,
          media: storyFiles.map((file) => ({
            id: file.id,
            type: file.fileType,
            url: file.fileUrl,
          })),
          timestamp: story.createdAt,
        },
      });
    } catch (error: any) {
      console.error(`❌ [SOCIAL] Error creando story:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
      });
    }
  };

  /**
   * GET /social/posters/get-posters
   * Obtener posters de un usuario específico (para el perfil)
   * Query params: customer_id
   */
  getPosters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customer_id } = req.query;

      if (!customer_id || typeof customer_id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'customer_id es requerido',
        });
      }

      console.log(`📱 [SOCIAL] Obteniendo posters para usuario: ${customer_id}`);

      const posters = await this.socialService.getPosters(customer_id);

      console.log(`✅ [SOCIAL] Posters obtenidos: ${posters.length}`);

      res.status(200).json({
        success: true,
        posters,
      });
    } catch (error) {
      console.error(`❌ [SOCIAL] Error obteniendo posters:`, error);
      next(error);
    }
  };

  /**
   * GET /social/stories/get-stories
   * Obtener stories del usuario y sus amigos
   * Query params: customer_id
   */
  getStories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customer_id } = req.query;

      if (!customer_id || typeof customer_id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'customer_id es requerido',
        });
      }

      console.log(`📱 [SOCIAL] Obteniendo stories para usuario: ${customer_id}`);

      const result = await this.socialService.getStories(customer_id);

      console.log(`✅ [SOCIAL] Stories obtenidas: ${result.userStories.length} del usuario, ${result.friendsStories.length} de amigos`);

      res.status(200).json({
        success: true,
        userStories: result.userStories,
        friendsStories: result.friendsStories,
      });
    } catch (error) {
      console.error(`❌ [SOCIAL] Error obteniendo stories:`, error);
      next(error);
    }
  };
}

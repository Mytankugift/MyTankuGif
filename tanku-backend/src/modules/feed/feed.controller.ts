import { Request, Response, NextFunction } from 'express';
import { FeedService } from './feed.service';
import { successResponse } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';

export class FeedController {
  private feedService: FeedService;

  constructor() {
    this.feedService = new FeedService();
  }

  /**
   * GET /api/v1/feed
   * Obtener feed combinado (productos + posters) con cursor-based pagination
   * 
   * Headers:
   * - X-Feed-Cursor: Token del cursor para paginación (opcional)
   * 
   * Nota: limit y postsPerProducts están hardcodeados en el backend
   */
  getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`\n📰 [FEED-CONTROLLER] ========== SOLICITUD DE FEED ==========`);
      console.log(`📰 [FEED-CONTROLLER] User ID: ${(req as RequestWithUser).user?.id || 'No autenticado'}`);
      console.log(`📰 [FEED-CONTROLLER] Cursor Token: ${req.headers['x-feed-cursor'] || 'No proporcionado'}`);
      console.log(`📰 [FEED-CONTROLLER] Category ID: ${req.query.categoryId || 'No especificado'}`);
      
      const userId = (req as RequestWithUser).user?.id;
      
      // Leer cursor token del header (case-insensitive)
      const cursorToken = req.headers['x-feed-cursor'] as string | undefined;
      
      // Leer categoryId de query params (opcional)
      const categoryId = req.query.categoryId as string | undefined;

      console.log(`📰 [FEED-CONTROLLER] Obteniendo feed...`);
      const feed = await this.feedService.getFeed(cursorToken, userId, categoryId);

      console.log(`📰 [FEED-CONTROLLER] Feed obtenido exitosamente:`);
      console.log(`📰 [FEED-CONTROLLER] - Items: ${feed.items?.length || 0}`);
      console.log(`📰 [FEED-CONTROLLER] - Next Cursor Token: ${feed.nextCursorToken ? 'Sí' : 'No'}`);
      console.log(`📰 [FEED-CONTROLLER] ==========================================\n`);

      res.status(200).json(successResponse(feed));
    } catch (error: any) {
      console.error(`\n❌ [FEED-CONTROLLER] ========== ERROR OBTENIENDO FEED ==========`);
      console.error(`❌ [FEED-CONTROLLER] Error:`, error?.message);
      console.error(`❌ [FEED-CONTROLLER] Stack:`, error?.stack);
      console.error(`❌ [FEED-CONTROLLER] Name:`, error?.name);
      
      // Si el error es relacionado con Prisma, agregar información adicional
      if (error?.code === 'P2001' || error?.message?.includes('model') || error?.message?.includes('GlobalRanking')) {
        console.error(`❌ [FEED-CONTROLLER] Error de Prisma - Verificar que el modelo GlobalRanking exista`);
        console.error(`❌ [FEED-CONTROLLER] Ejecutar: npx prisma generate`);
      }
      
      console.error(`❌ [FEED-CONTROLLER] ==========================================\n`);
      next(error);
    }
  };
}


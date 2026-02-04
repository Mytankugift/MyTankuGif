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
      const userId = (req as RequestWithUser).user?.id;
      
      // Leer cursor token del header (case-insensitive)
      const cursorToken = req.headers['x-feed-cursor'] as string | undefined;
      
      // Leer categoryId de query params (opcional)
      const categoryId = req.query.categoryId as string | undefined;
      
      // Leer search de query params (opcional)
      const search = req.query.search as string | undefined;

      const feed = await this.feedService.getFeed(cursorToken, userId, categoryId, search);

      res.status(200).json(successResponse(feed));
    } catch (error: any) {
      console.error(`\n❌ [FEED-CONTROLLER] ========== ERROR OBTENIENDO FEED ==========`);
      console.error(`❌ [FEED-CONTROLLER] Error:`, error?.message);
      console.error(`❌ [FEED-CONTROLLER] Stack:`, error?.stack);
      console.error(`❌ [FEED-CONTROLLER] Name:`, error?.name);
      
      // Si es error de tabla no existente (P2021), retornar feed vacío en lugar de error 500
      if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('global_ranking')) {
        console.warn(`⚠️ [FEED-CONTROLLER] Tabla global_ranking no existe. Retornando feed vacío.`);
        console.warn(`⚠️ [FEED-CONTROLLER] Para habilitar productos, ejecutar: npm run fix:feed:tables`);
        // Retornar feed vacío para que el frontend no falle
        return res.status(200).json(successResponse({
          items: [],
          nextCursorToken: null,
          hasMore: false,
        }));
      }
      
      // Si el error es relacionado con Prisma, agregar información adicional
      if (error?.code?.startsWith('P') || error?.message?.includes('model') || error?.message?.includes('GlobalRanking')) {
        console.error(`❌ [FEED-CONTROLLER] Error de Prisma - Verificar que el modelo GlobalRanking exista`);
        console.error(`❌ [FEED-CONTROLLER] Ejecutar: npx prisma generate`);
        // Retornar feed vacío en lugar de error 500
        return res.status(200).json(successResponse({
          items: [],
          nextCursorToken: null,
          hasMore: false,
        }));
      }
      
      console.error(`❌ [FEED-CONTROLLER] ==========================================\n`);
      next(error);
    }
  };
}


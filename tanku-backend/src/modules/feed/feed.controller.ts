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

      const feed = await this.feedService.getFeed(cursorToken, userId, categoryId);

      res.status(200).json(successResponse(feed));
    } catch (error) {
      next(error);
    }
  };
}


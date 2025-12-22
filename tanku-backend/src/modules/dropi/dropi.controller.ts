import { Request, Response, NextFunction } from 'express';
import { DropiService } from './dropi.service';
import { BadRequestError } from '../../shared/errors/AppError';

export class DropiController {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
  }

  /**
   * POST /api/v1/dropi/sync
   * Sincronizar productos desde Dropi
   * Query params: limit (default: 10)
   */
  syncProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : 10;

      if (limit < 1 || limit > 100) {
        throw new BadRequestError('El límite debe estar entre 1 y 100');
      }

      const result = await this.dropiService.syncProducts(limit);

      res.status(200).json({
        success: true,
        message: `Se sincronizaron ${result.synced} productos desde Dropi`,
        data: {
          synced: result.synced,
          products: result.products,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

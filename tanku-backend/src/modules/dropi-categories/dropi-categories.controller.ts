import { Request, Response, NextFunction } from 'express';
import { DropiCategoriesService } from './dropi-categories.service';

export class DropiCategoriesController {
  private dropiCategoriesService: DropiCategoriesService;

  constructor() {
    this.dropiCategoriesService = new DropiCategoriesService();
  }

  /**
   * POST /api/v1/dropi/sync-categories
   * Sincronizar categorías desde Dropi a la tabla Category
   */
  syncCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`\n🔄 [DROPI CATEGORIES] Endpoint de sincronización de categorías llamado`);

      const result = await this.dropiCategoriesService.syncCategories();

      res.status(200).json(result);
    } catch (error: any) {
      console.error(`❌ [DROPI CATEGORIES] Error:`, error);
      next(error);
    }
  };
}

import { Request, Response, NextFunction } from 'express';
import { CategoriesSyncService } from './categories-sync.service';

export class CategoriesSyncController {
  private syncService: CategoriesSyncService;

  constructor() {
    this.syncService = new CategoriesSyncService();
  }

  /**
   * POST /api/v1/dropi/sync-categories
   * Sincronizar categorías desde Dropi a nuestra base de datos
   */
  syncCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔄 [CATEGORIES SYNC] Petición de sincronización recibida');

      const result = await this.syncService.syncCategoriesFromDropi();

      res.status(200).json({
        success: result.success,
        message: `Sincronización de categorías completada (fuente: ${result.source})`,
        source: result.source,
        total: result.total,
        processed: result.processed,
        errors: result.errors,
        error_details: result.errorDetails,
        categories: result.categories,
      });
    } catch (error) {
      console.error('❌ [CATEGORIES SYNC] Error en sincronización:', error);
      next(error);
    }
  };
}

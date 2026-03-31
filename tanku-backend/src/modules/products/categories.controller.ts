import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service';
import { successResponse } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';
import { getBirthDateForUserId } from '../../shared/catalog/catalog-age-viewer';
import { viewerCannotSeeAdultCatalog } from '../../shared/catalog/catalog-age-policy';

export class CategoriesController {
  private categoriesService: CategoriesService;

  constructor() {
    this.categoriesService = new CategoriesService();
  }

  /**
   * GET /api/v1/categories
   * Listar todas las categorías normalizadas
   * Con Bearer: si el usuario es mayor de edad (fecha en BD), incluye categorías +18
   */
  listCategoriesNormalized = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as RequestWithUser).user?.id;
      const birthDate = await getBirthDateForUserId(userId);
      const hideAdultRestricted = viewerCannotSeeAdultCatalog(Boolean(userId), birthDate);

      const categories = await this.categoriesService.listCategoriesNormalized(hideAdultRestricted);

      res.status(200).json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  };
}


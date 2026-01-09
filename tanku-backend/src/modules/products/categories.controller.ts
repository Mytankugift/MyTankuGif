import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service';
import { successResponse } from '../../shared/response';

export class CategoriesController {
  private categoriesService: CategoriesService;

  constructor() {
    this.categoriesService = new CategoriesService();
  }

  /**
   * GET /api/v1/categories
   * Listar todas las categorías normalizadas
   */
  listCategoriesNormalized = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.categoriesService.listCategoriesNormalized();

      res.status(200).json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  };
}


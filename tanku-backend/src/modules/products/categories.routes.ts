import { Router } from 'express';
import { CategoriesController } from './categories.controller';

const router = Router();
const categoriesController = new CategoriesController();

/**
 * GET /api/v1/categories
 * Listar todas las categorías
 */
router.get('/', categoriesController.listCategoriesNormalized);

export default router;


import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { optionalAuthenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const categoriesController = new CategoriesController();

/**
 * GET /api/v1/categories
 * Listar todas las categorías (opcional JWT: adultos verificados ven también +18)
 */
router.get('/', optionalAuthenticate, categoriesController.listCategoriesNormalized);

export default router;


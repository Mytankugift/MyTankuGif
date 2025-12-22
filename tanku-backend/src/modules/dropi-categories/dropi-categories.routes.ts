import { Router } from 'express';
import { DropiCategoriesController } from './dropi-categories.controller';

const router = Router();
const dropiCategoriesController = new DropiCategoriesController();

/**
 * POST /api/v1/dropi/sync-categories
 * Sincronizar categorías desde Dropi a la tabla Category
 * 
 * También soporta GET para pruebas desde el navegador
 */
router.post('/sync-categories', dropiCategoriesController.syncCategories);
router.get('/sync-categories', dropiCategoriesController.syncCategories); // Para pruebas desde navegador

export default router;

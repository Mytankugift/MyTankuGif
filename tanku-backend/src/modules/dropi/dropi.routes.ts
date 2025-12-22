import { Router } from 'express';
import { DropiController } from './dropi.controller';
import { CategoriesSyncController } from '../products/categories-sync.controller';

const router = Router();
const dropiController = new DropiController();
const categoriesSyncController = new CategoriesSyncController();

/**
 * POST /api/v1/dropi/sync
 * Sincronizar productos desde Dropi
 * Query params: limit (default: 10)
 * 
 * También soporta GET para pruebas desde el navegador
 */
router.post('/sync', dropiController.syncProducts);
router.get('/sync', dropiController.syncProducts); // Para pruebas desde navegador

/**
 * POST /api/v1/dropi/sync-categories
 * Sincronizar categorías desde Dropi a nuestra base de datos
 * 
 * También soporta GET para pruebas desde el navegador
 */
router.post('/sync-categories', categoriesSyncController.syncCategories);
router.get('/sync-categories', categoriesSyncController.syncCategories); // Para pruebas desde navegador

export default router;

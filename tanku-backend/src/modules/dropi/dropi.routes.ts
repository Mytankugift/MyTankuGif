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

/**
 * GET /api/v1/dropi/departments
 * Obtener lista de departamentos desde Dropi
 */
router.get('/departments', dropiController.getDepartments);

/**
 * GET /api/v1/dropi/cities
 * Obtener lista de ciudades (desde BD cache, o sincronizar desde Dropi si no hay datos)
 */
router.get('/cities', dropiController.getCities);

/**
 * POST /api/v1/dropi/sync-departments
 * Sincronizar departamentos desde Dropi a nuestra BD
 */
router.post('/sync-departments', dropiController.syncDepartments);

/**
 * POST /api/v1/dropi/sync-cities
 * Sincronizar ciudades desde Dropi a nuestra BD
 * Body: { department_id?: number, rate_type?: string }
 */
router.post('/sync-cities', dropiController.syncCities);

export default router;

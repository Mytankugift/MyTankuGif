import { Router } from 'express';
import { DropiNormalizeController } from './dropi-normalize.controller';

const router = Router();
const dropiNormalizeController = new DropiNormalizeController();

/**
 * POST /api/v1/dropi/normalize
 * Normalizar productos desde DropiRawProduct a DropiProduct
 * 
 * Query params:
 * - batch_size: número de productos a normalizar por lote (default: 100)
 * - offset: offset para continuar desde donde quedó (default: 0)
 * - category_id: filtrar por categoría Dropi (opcional)
 * 
 * También soporta GET para pruebas desde el navegador
 */
router.post('/normalize', dropiNormalizeController.normalize);
router.get('/normalize', dropiNormalizeController.normalize); // Para pruebas desde navegador

export default router;

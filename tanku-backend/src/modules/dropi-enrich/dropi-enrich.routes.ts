import { Router } from 'express';
import { DropiEnrichController } from './dropi-enrich.controller';

const router = Router();
const dropiEnrichController = new DropiEnrichController();

/**
 * POST /api/v1/dropi/enrich
 * Enriquecer productos con información detallada desde Dropi
 * 
 * Query params:
 * - limit: máximo de productos a procesar (default: 1000)
 * - priority: "active" | "high_stock" | "all" (default: "active")
 * - batch_size: número de productos a procesar en paralelo (default: 50)
 * - force: "true" | "false" (default: "false") - Si es true, enriquece incluso productos que ya tienen descripción
 * 
 * También soporta GET para pruebas desde el navegador
 */
router.post('/enrich', dropiEnrichController.enrich);
router.get('/enrich', dropiEnrichController.enrich); // Para pruebas desde navegador

export default router;

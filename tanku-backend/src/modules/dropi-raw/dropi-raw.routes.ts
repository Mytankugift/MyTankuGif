import { Router } from 'express';
import { DropiRawController } from './dropi-raw.controller';

const router = Router();
const dropiRawController = new DropiRawController();

/**
 * POST /api/v1/dropi/sync-raw
 * Sincronizar productos RAW desde Dropi
 * 
 * Query params:
 * - start_page: página inicial (default: 0)
 * - max_pages: máximo de páginas (null = todas)
 * 
 * También soporta GET para pruebas desde el navegador
 */
router.post('/sync-raw', dropiRawController.syncRaw);
router.get('/sync-raw', dropiRawController.syncRaw); // Para pruebas desde navegador

export default router;

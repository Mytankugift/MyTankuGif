import { Router } from 'express';
import { DropiSyncController } from './dropi-sync.controller';

const router = Router();
const dropiSyncController = new DropiSyncController();

/**
 * POST /api/v1/dropi/sync-to-backend
 * Sincronizar productos desde DropiProduct a Product/ProductVariant/WarehouseVariant
 * 
 * Query params:
 * - batch_size: número de productos a procesar por lote (default: 50)
 * - offset: offset para continuar desde donde quedó (default: 0)
 * - active_only: "true" | "false" - Solo productos activos (default: "true")
 * - skip_existing: "true" | "false" - Omitir productos que ya existen (default: "false")
 * 
 * También soporta GET para pruebas desde el navegador
 */
router.post('/sync-to-backend', dropiSyncController.syncToBackend);
router.get('/sync-to-backend', dropiSyncController.syncToBackend); // Para pruebas desde navegador

export default router;

import { Router } from 'express';
import { DropiJobsController } from './dropi-jobs.controller';

const router = Router();
const dropiJobsController = new DropiJobsController();

/**
 * POST /api/v1/dropi/jobs/raw
 * Crear job RAW
 */
router.post('/raw', dropiJobsController.createRawJob);

/**
 * POST /api/v1/dropi/jobs/normalize
 * Crear job NORMALIZE
 */
router.post('/normalize', dropiJobsController.createNormalizeJob);

/**
 * POST /api/v1/dropi/jobs/enrich
 * Crear job ENRICH
 */
router.post('/enrich', dropiJobsController.createEnrichJob);

/**
 * POST /api/v1/dropi/jobs/sync-product
 * Crear job SYNC_PRODUCT
 */
router.post('/sync-product', dropiJobsController.createSyncProductJob);

/**
 * POST /api/v1/dropi/jobs/stock
 * Crear job SYNC_STOCK (para cron)
 */
router.post('/stock', dropiJobsController.createSyncStockJob);

/**
 * GET /api/v1/dropi/jobs
 * Listar jobs (debe ir ANTES de /:id para evitar conflictos)
 */
router.get('/', dropiJobsController.listJobs);

/**
 * GET /api/v1/dropi/jobs/:id
 * Obtener estado de un job
 */
router.get('/:id', dropiJobsController.getJobStatus);

/**
 * DELETE /api/v1/dropi/jobs/:id
 * Cancelar un job (solo PENDING o RUNNING)
 */
router.delete('/:id', dropiJobsController.cancelJob);

export default router;

import { Router } from 'express';
import { RegionsController } from './regions.controller';

const router = Router();
const regionsController = new RegionsController();

/**
 * GET /api/v1/regions
 * Listar todas las regiones disponibles
 */
router.get('/', regionsController.listRegions);

/**
 * GET /api/v1/regions/:id
 * Obtener región por ID
 */
router.get('/:id', regionsController.getRegionById);

export default router;


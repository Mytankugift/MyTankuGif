import { Router } from 'express';
import { EpaycoController } from './epayco.controller';

const router = Router();
const epaycoController = new EpaycoController();

/**
 * POST /api/v1/webhook/epayco/:orderId
 * Webhook de ePayco para confirmar pago
 */
router.post('/:orderId', epaycoController.webhook);

export default router;

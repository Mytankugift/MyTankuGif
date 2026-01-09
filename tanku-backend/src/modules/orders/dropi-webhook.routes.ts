import { Router } from 'express';
import { DropiWebhookController } from './dropi-webhook.controller';

const router = Router();
const dropiWebhookController = new DropiWebhookController();

/**
 * POST /api/v1/webhook/dropi
 * Webhook de Dropi para actualizar estado de órdenes
 */
router.post('/', dropiWebhookController.webhook);

export default router;


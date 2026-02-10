import { Router } from 'express';
import { GiftController } from './gift.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const giftController = new GiftController();

/**
 * GET /api/v1/gifts/recipient/:userId/eligibility
 * Validar si un usuario puede recibir regalos
 * No requiere autenticación (puede ser público para verificar antes de agregar al carrito)
 */
router.get('/recipient/:userId/eligibility', giftController.validateRecipientEligibility);

/**
 * GET /api/v1/gifts/validate-recipient?recipientId=...&senderId=...
 * Validar elegibilidad usando query params (para uso en checkout)
 * Requiere autenticación
 */
router.get('/validate-recipient', authenticate, giftController.validateRecipient);

/**
 * GET /api/v1/gifts/orders?type=sent|received
 * Obtener regalos enviados o recibidos
 * Requiere autenticación
 */
router.get('/orders', authenticate, giftController.getGiftOrders);

export default router;


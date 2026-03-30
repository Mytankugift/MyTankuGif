import { Router } from 'express';
import { CheckoutController } from './checkout.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const checkoutController = new CheckoutController();

/**
 * GET /api/v1/checkout/webhook-url
 * Obtener URL del webhook para ePayco
 * No requiere autenticación
 */
router.get('/webhook-url', checkoutController.getWebhookUrl);

/**
 * POST /api/v1/checkout/add-order
 * Crear orden desde checkout
 * REQUIERE AUTENTICACIÓN: El usuario debe estar logueado para completar el checkout
 */
router.post('/add-order', authenticate, checkoutController.addOrder);

/**
 * POST /api/v1/checkout/gift-direct
 * Crear orden de regalo directamente desde wishlist (sin carrito)
 * REQUIERE AUTENTICACIÓN: El usuario debe estar logueado para enviar regalos
 */
router.post('/gift-direct', authenticate, checkoutController.createDirectGiftOrder);

/**
 * POST /api/v1/checkout/epayco-smart-session
 * ePayco Smart Checkout (Apify + sessionId para checkout-v2.js)
 */
router.post('/epayco-smart-session', authenticate, checkoutController.createEpaycoSmartSession);

export default router;

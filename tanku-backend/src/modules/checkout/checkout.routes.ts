import { Router } from 'express';
import { CheckoutController } from './checkout.controller';

const router = Router();
const checkoutController = new CheckoutController();

/**
 * POST /api/v1/checkout/add-order
 * Crear orden desde checkout
 */
router.post('/add-order', checkoutController.addOrder);

export default router;

import { Router } from 'express';
import { CheckoutController } from './checkout.controller';

const router = Router();
const checkoutController = new CheckoutController();

/**
 * POST /store/checkout/add-order
 * Crear orden desde checkout
 */
router.post('/add-order', checkoutController.addOrder);

export default router;

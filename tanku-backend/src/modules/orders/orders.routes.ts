import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { EpaycoController } from './epayco.controller';

const router = Router();
const ordersController = new OrdersController();
const epaycoController = new EpaycoController();

/**
 * POST /api/v1/orders
 * Crear una nueva orden
 */
router.post('/', ordersController.createOrder);

/**
 * GET /api/v1/orders
 * Obtener historial de órdenes del usuario
 */
router.get('/', ordersController.getOrders);

/**
 * GET /store/order/item/:itemId/dropi-status
 * Obtener estado de Dropi para un item específico
 * IMPORTANTE: Esta ruta debe ir ANTES de /:orderId/dropi-status para evitar conflictos
 */
router.get('/item/:itemId/dropi-status', ordersController.getDropiStatusByItem);

/**
 * GET /store/order/:orderId/dropi-status
 * Obtener estado de una orden en Dropi
 * IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar conflictos
 */
router.get('/:orderId/dropi-status', ordersController.getDropiOrderStatus);

/**
 * POST /api/v1/orders/:id/create-dropi
 * Crear orden en Dropi (después de pago exitoso)
 */
router.post('/:id/create-dropi', ordersController.createDropiOrder);

/**
 * GET /api/v1/orders/:id
 * GET /store/orders/:id
 * Obtener orden por ID
 */
router.get('/:id', ordersController.getOrder);

export default router;

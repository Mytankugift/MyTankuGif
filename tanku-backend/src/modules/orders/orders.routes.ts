import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { EpaycoController } from './epayco.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const ordersController = new OrdersController();
const epaycoController = new EpaycoController();

/**
 * POST /api/v1/orders
 * Crear una nueva orden
 */
router.post('/', ordersController.createOrder);

/**
 * GET /api/v1/orders/stalker-gifts
 * Obtener órdenes de StalkerGift del usuario (tanto enviadas como recibidas)
 * IMPORTANTE: Esta ruta debe ir ANTES de / para evitar conflictos
 */
router.get('/stalker-gifts', authenticate, ordersController.getStalkerGiftOrders);

/**
 * GET /api/v1/orders
 * Obtener historial de órdenes del usuario autenticado (solo órdenes normales, excluye StalkerGift)
 */
router.get('/', authenticate, ordersController.getOrders);

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
 * GET /api/v1/orders/transaction/:transactionId
 * Obtener orden por transactionId (para ePayco)
 * IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar conflictos
 */
router.get('/transaction/:transactionId', ordersController.getOrderByTransactionId);

/**
 * GET /api/v1/orders/test/dropi-orders
 * ⚠️ ENDPOINT TEMPORAL PARA TESTING
 * Lista los dropiOrderId disponibles para probar el webhook de Dropi
 * Query params: ?limit=10 (opcional, default: 10)
 */
router.get('/test/dropi-orders', ordersController.getDropiOrdersForTesting);

/**
 * GET /api/v1/orders/:id
 * GET /store/orders/:id
 * Obtener orden por ID
 */
router.get('/:id', ordersController.getOrder);

/**
 * DELETE /api/v1/orders/:id
 * Eliminar una orden (usado cuando Epayco falla)
 */
router.delete('/:id', authenticate, ordersController.deleteOrder);

export default router;

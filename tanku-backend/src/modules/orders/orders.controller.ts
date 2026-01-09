import { Request, Response, NextFunction } from 'express';
import { OrdersService, CreateOrderInput } from './orders.service';
import { DropiOrdersService } from './dropi-orders.service';
import { prisma } from '../../config/database';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { BadRequestError } from '../../shared/errors/AppError';
import { RequestWithUser } from '../../shared/types';

export class OrdersController {
  private ordersService: OrdersService;
  private dropiOrdersService: DropiOrdersService;

  constructor() {
    this.ordersService = new OrdersService();
    this.dropiOrdersService = new DropiOrdersService();
  }

  /**
   * POST /api/v1/orders
   * Crear una nueva orden
   * 
   * Body debe incluir:
   * - userId o customer_id: ID del usuario
   * - email: email del usuario
   * - paymentMethod: método de pago
   * - total, subtotal, shippingTotal: totales
   * - address: dirección de envío
   * - items: array de items
   * - isStalkerGift: boolean (opcional)
   * - metadata: objeto JSON (opcional)
   */
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || req.body.userId || req.body.customer_id;
      if (!userId || typeof userId !== 'string') {
        throw new BadRequestError('userId o customer_id es requerido');
      }

      const {
        email,
        paymentMethod,
        total,
        subtotal,
        shippingTotal,
        address,
        items,
        isStalkerGift,
        metadata,
      } = req.body;

      // Validaciones
      if (!email || !paymentMethod || !total || !address || !items) {
        throw new BadRequestError('Faltan campos requeridos: email, paymentMethod, total, address, items');
      }

      const orderInput: CreateOrderInput = {
        userId,
        email,
        paymentMethod,
        total: Math.round(total),
        subtotal: Math.round(subtotal),
        shippingTotal: shippingTotal ? Math.round(shippingTotal) : 0,
        address,
        items: items.map((item: any) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: Math.round(item.price),
        })),
        isStalkerGift: isStalkerGift || false,
        metadata,
      };

      const order = await this.ordersService.createOrder(orderInput);

      res.status(201).json(successResponse(order));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error creando orden:`, error);
      next(error);
    }
  };

  /**
   * GET /api/v1/orders/:id
   * GET /store/orders/:id
   * Obtener orden por ID
   * 
   * Query params (opcional):
   * - userId o customer_id: para verificar permisos
   */
  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || req.query.userId || req.query.customer_id;

      console.log(`📋 [ORDERS] Obteniendo orden: ${id}`);

      const order = await this.ordersService.getOrderById(id, userId as string | undefined);

      console.log(`📋 [ORDERS] Orden obtenida:`, {
        id: order.id,
        hasAddress: !!order.address,
        addressData: order.address ? {
          firstName: order.address.firstName,
          lastName: order.address.lastName,
          city: order.address.city,
          state: order.address.state,
          address1: order.address.address1,
          detail: order.address.address2,
        } : null,
      });

      // Devolver formato estándar normalizado
      res.status(200).json(successResponse(order));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo orden:`, error);
      next(error);
    }
  };

  /**
   * GET /api/v1/orders/transaction/:transactionId
   * Obtener orden por transactionId (para ePayco)
   */
  getOrderByTransactionId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;
      const userId = (req as any).user?.id || req.query.userId || req.query.customer_id;

      console.log(`📋 [ORDERS] Obteniendo orden por transactionId: ${transactionId}`);

      const order = await this.ordersService.getOrderByTransactionId(
        transactionId,
        userId as string | undefined
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Orden no encontrada',
        });
      }

      console.log(`📋 [ORDERS] Orden obtenida por transactionId:`, {
        id: order.id,
        transactionId: order.transactionId,
        paymentStatus: order.paymentStatus,
      });

      res.status(200).json(successResponse(order));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo orden por transactionId:`, error);
      next(error);
    }
  };

  /**
   * GET /api/v1/orders
   * Obtener historial de órdenes del usuario
   * 
   * Query params:
   * - userId: ID del usuario (requerido)
   * - limit: número de órdenes a retornar (default: 20)
   * - offset: offset para paginación (default: 0)
   */
  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // El endpoint requiere autenticación, obtener userId del usuario autenticado
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'Usuario no autenticado'));
      }

      const userId = requestWithUser.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.ordersService.getUserOrders(userId, limit, offset);

      res.status(200).json(successResponse(result));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo órdenes:`, error);
      next(error);
    }
  };

  /**
   * POST /api/v1/orders/:id/create-dropi
   * Crear orden en Dropi (después de pago exitoso)
   */
  createDropiOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      console.log(`📦 [ORDERS] Creando orden en Dropi para orden: ${id}`);

      const result = await this.dropiOrdersService.createOrderInDropi(id);

      res.status(200).json(successResponse(result));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error creando orden en Dropi:`, error);
      next(error);
    }
  };

  /**
   * GET /store/order/:orderId/dropi-status
   * Obtener estado de una orden en Dropi
   */
  getDropiOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new BadRequestError('orderId es requerido');
      }

      console.log(`📋 [ORDERS] Obteniendo estado de Dropi para orden: ${orderId}`);

      // Obtener la orden local para obtener los dropiOrderIds
      const order = await this.ordersService.getOrderById(orderId);

      // Obtener dropiOrderIds de los items
      const dropiOrderIds = order.items
        ?.map((item: any) => item.dropiOrderId)
        .filter((id): id is number => id !== null) || [];
      
      if (dropiOrderIds.length === 0) {
        throw new BadRequestError('Esta orden no tiene IDs de Dropi asociados');
      }

      // Consultar estado en Dropi del primer orderId (o podríamos consultar todos)
      const dropiStatus = await this.dropiOrdersService.getDropiOrderStatus(dropiOrderIds[0]);

      res.status(200).json(successResponse(dropiStatus));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo estado de Dropi:`, error?.message);
      next(error);
    }
  };

  /**
   * GET /store/order/item/:itemId/dropi-status
   * Obtener estado de Dropi para un item específico de la orden
   */
  getDropiStatusByItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        throw new BadRequestError('itemId es requerido');
      }

      console.log(`📋 [ORDERS] Obteniendo estado de Dropi para item: ${itemId}`);

      // Obtener el item de la orden
      const item = await prisma.orderItem.findUnique({
        where: { id: itemId },
        select: {
          dropiOrderId: true,
        },
      });

      if (!item || !item.dropiOrderId) {
        throw new BadRequestError('Este item no tiene un ID de Dropi asociado');
      }

      // Consultar estado en Dropi
      const dropiStatus = await this.dropiOrdersService.getDropiOrderStatus(item.dropiOrderId);

      res.status(200).json(successResponse(dropiStatus));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo estado de Dropi por item:`, error?.message);
      next(error);
    }
  };

  /**
   * DELETE /api/v1/orders/:id
   * Eliminar una orden (usado cuando Epayco falla antes del pago)
   */
  deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new BadRequestError('Usuario no autenticado');
      }

      // Verificar que la orden pertenece al usuario
      const order = await this.ordersService.getOrderById(id);
      if (order.userId !== userId) {
        throw new BadRequestError('No tienes permiso para eliminar esta orden');
      }

      await this.ordersService.deleteOrder(id);

      res.status(200).json(successResponse({ message: 'Orden eliminada exitosamente' }));
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error eliminando orden:`, error);
      next(error);
    }
  };
}

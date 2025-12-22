import { Request, Response, NextFunction } from 'express';
import { OrdersService, CreateOrderInput } from './orders.service';
import { DropiOrdersService } from './dropi-orders.service';
import { prisma } from '../../config/database';

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
        return res.status(400).json({
          success: false,
          error: 'userId o customer_id es requerido',
        });
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
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos',
        });
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

      res.status(201).json({
        success: true,
        order,
      });
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

      // Formatear respuesta compatible con Medusa SDK (para frontend)
      const medusaCompatibleOrder = {
        id: order.id,
        email: order.email,
        status: order.status,
        payment_status: order.paymentStatus,
        payment_method: order.paymentMethod,
        total: order.total,
        subtotal: order.subtotal,
        shipping_total: order.shippingTotal,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        metadata: {
          dropi_order_ids: order.items?.map(item => item.dropiOrderId).filter(Boolean) || [],
        },
        shipping_address: order.address
          ? {
              first_name: order.address.firstName,
              last_name: order.address.lastName,
              phone: order.address.phone,
              address_1: order.address.address1,
              address_2: order.address.address2 || null,
              city: order.address.city,
              province: order.address.state,
              postal_code: order.address.postalCode,
              country_code: order.address.country,
            }
          : null,
        items: order.items.map((item) => ({
          id: item.id,
          variant_id: item.variantId,
          quantity: item.quantity,
          finalPrice: item.finalPrice,
          dropiOrderId: item.dropiOrderId,
          dropiOrderNumber: item.dropiOrderNumber,
          dropiShippingCost: item.dropiShippingCost,
          dropiStatus: item.dropiStatus,
          unit_price: item.price,
          final_price: item.finalPrice || Math.round((item.price * 1.15) + 10000), // Precio con incremento (15% + $10,000)
          total: (item.finalPrice || Math.round((item.price * 1.15) + 10000)) * item.quantity, // Total del item
          title: item.variant.title,
          product: {
            id: item.product.id,
            title: item.product.title,
            handle: item.product.handle,
          },
          variant: {
            id: item.variant.id,
            sku: item.variant.sku,
            title: item.variant.title,
            price: item.variant.price,
          },
        })),
      };

      // Si es ruta /store/orders/:id, devolver formato Medusa
      if (req.path.startsWith('/store/orders')) {
        res.status(200).json({
          order: medusaCompatibleOrder,
        });
      } else {
        // Si es ruta /api/v1/orders/:id, devolver formato estándar
        res.status(200).json({
          success: true,
          order,
        });
      }
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo orden:`, error);
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
      const userId = (req as any).user?.id || req.query.userId || req.query.customer_id;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'userId o customer_id es requerido',
        });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.ordersService.getUserOrders(userId, limit, offset);

      res.status(200).json({
        success: true,
        ...result,
      });
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

      res.status(200).json({
        success: result.success,
        dropiOrderIds: result.dropiOrderIds,
        errors: result.errors,
      });
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
        return res.status(400).json({
          success: false,
          error: 'orderId es requerido',
        });
      }

      console.log(`📋 [ORDERS] Obteniendo estado de Dropi para orden: ${orderId}`);

      // Obtener la orden local para obtener los dropiOrderIds
      const order = await this.ordersService.getOrderById(orderId);

      // Obtener dropiOrderIds de los items
      const dropiOrderIds = order.items
        ?.map((item: any) => item.dropiOrderId)
        .filter((id): id is number => id !== null) || [];
      
      if (dropiOrderIds.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Esta orden no tiene IDs de Dropi asociados',
        });
      }

      // Consultar estado en Dropi del primer orderId (o podríamos consultar todos)
      const dropiStatus = await this.dropiOrdersService.getDropiOrderStatus(dropiOrderIds[0]);

      res.status(200).json({
        success: true,
        ...dropiStatus,
      });
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo estado de Dropi:`, error?.message);
      res.status(500).json({
        success: false,
        error: error?.message || 'Error al obtener estado de Dropi',
      });
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
        return res.status(400).json({
          success: false,
          error: 'itemId es requerido',
        });
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
        return res.status(404).json({
          success: false,
          error: 'Este item no tiene un ID de Dropi asociado',
        });
      }

      // Consultar estado en Dropi
      const dropiStatus = await this.dropiOrdersService.getDropiOrderStatus(item.dropiOrderId);

      res.status(200).json({
        success: true,
        ...dropiStatus,
      });
    } catch (error: any) {
      console.error(`❌ [ORDERS] Error obteniendo estado de Dropi por item:`, error?.message);
      res.status(500).json({
        success: false,
        error: error?.message || 'Error al obtener estado de Dropi',
      });
      next(error);
    }
  };
}

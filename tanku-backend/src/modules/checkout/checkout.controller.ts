import { Request, Response, NextFunction } from 'express';
import { CheckoutService, CheckoutOrderRequest, DataCart } from './checkout.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { BadRequestError } from '../../shared/errors/AppError';
import { env } from '../../config/env';

export class CheckoutController {
  private checkoutService: CheckoutService;

  constructor() {
    this.checkoutService = new CheckoutService();
  }

  /**
   * GET /api/v1/checkout/webhook-url
   * Obtener URL del webhook para ePayco
   * 
   * Query params:
   * - cartId: ID del carrito
   * 
   * No requiere autenticación (solo genera URL)
   */
  getWebhookUrl = async (req: Request, res: Response) => {
    try {
      const { cartId, orderId } = req.query;

      // Aceptar tanto cartId como orderId (para regalos directos)
      const identifier = cartId || orderId;

      if (!identifier || typeof identifier !== 'string') {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'cartId u orderId es requerido'));
      }

      // Obtener URL base del webhook desde variables de entorno
      // En producción: http://72.61.79.91 (proxy) o https://api.mytanku.com
      // En desarrollo: puede ser ngrok o localhost
      const webhookBaseUrl = env.WEBHOOK_BASE_URL || 'http://72.61.79.91';
      // El webhook ahora acepta tanto cartId como orderId
      const webhookUrl = `${webhookBaseUrl}/api/v1/webhook/epayco/${identifier}`;

      console.log(`🔗 [CHECKOUT] URL de webhook generada: ${webhookUrl} (identifier: ${identifier})`);

      return res.status(200).json(successResponse({ webhookUrl }));
    } catch (error: any) {
      console.error('❌ [CHECKOUT] Error generando URL de webhook:', error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_ERROR, 'Error generando URL de webhook'));
    }
  };

  /**
   * POST /api/v1/checkout/add-order
   * Crear orden desde checkout
   * 
   * Body:
   * {
   *   dataForm: CheckoutOrderRequest,
   *   dataCart: DataCart
   * }
   */
  addOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dataForm, dataCart } = req.body as {
        dataForm: CheckoutOrderRequest;
        dataCart: DataCart;
      };

      if (!dataForm || !dataCart) {
        throw new BadRequestError('dataForm y dataCart son requeridos');
      }

      // Obtener userId del request (debe venir de auth middleware)
      const requestWithUser = req as any;
      const userId = requestWithUser.user?.id;

      // Verificar que el usuario esté autenticado (required por middleware, pero verificar por si acaso)
      if (!userId) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'Debes iniciar sesión para completar el checkout'));
      }

      console.log(`📝 [CHECKOUT] Recibida solicitud de creación de orden`);
      console.log(`📝 [CHECKOUT] Usuario: ${userId}`);
      console.log(`📝 [CHECKOUT] Email: ${dataForm.email}`);
      console.log(`📝 [CHECKOUT] Payment method: ${dataForm.payment_method}`);

      // Si es Epayco, solo preparar datos sin crear orden
      if (dataForm.payment_method === 'epayco') {
        const preparedData = await this.checkoutService.prepareEpaycoCheckout(
          dataForm,
          dataCart,
          userId
        );

        // Retornar datos preparados (sin orden)
        return res.status(200).json(successResponse({
          cartId: preparedData.cartId,
          total: preparedData.total,
          subtotal: preparedData.subtotal,
          shippingTotal: preparedData.shippingTotal,
          paymentMethod: 'epayco',
          message: 'Datos preparados para Epayco. La orden se creará cuando el pago sea confirmado.',
        }));
      }

      // Para contra entrega, crear orden normalmente
      const order = await this.checkoutService.createOrderFromCheckout(
        dataForm,
        dataCart,
        userId
      );

      // Formatear respuesta compatible con el frontend
      const orderWithDropi = order as any;
      const orderResponse = {
        id: order.id,
        email: order.email,
        status: order.status,
        payment_status: order.paymentStatus,
        payment_method: order.paymentMethod,
        total: order.total,
        total_amount: order.total, // Compatibilidad con frontend
        subtotal: order.subtotal,
        shipping_total: order.shippingTotal,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        dropiSuccess: orderWithDropi.dropiSuccess || false,
        dropiOrderIds: orderWithDropi.dropiOrderIds || [],
        items: order.items.map((item: any) => ({
          id: item.id,
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.price,
          original_total: item.price * item.quantity,
          title: item.variant.title,
          product: {
            id: item.product.id,
            title: item.product.title,
          },
          variant: {
            id: item.variant.id,
            sku: item.variant.sku,
            title: item.variant.title,
            price: item.variant.price,
          },
        })),
        shipping_address: order.address
          ? {
              first_name: order.address.firstName,
              last_name: order.address.lastName,
              phone: order.address.phone,
              address_1: order.address.address1,
              address_2: order.address.address2,
              city: order.address.city,
              province: order.address.state,
              postal_code: order.address.postalCode,
              country_code: order.address.country,
            }
          : null,
      };

      res.status(201).json(successResponse(orderResponse));
    } catch (error: any) {
      console.error(`❌ [CHECKOUT] Error creando orden:`, error);
      next(error);
    }
  };

  /**
   * POST /api/v1/checkout/gift-direct
   * Crear orden de regalo directamente desde wishlist (sin carrito)
   * 
   * Body:
   * {
   *   variant_id: string,
   *   quantity: number,
   *   recipient_id: string,
   *   email: string,
   *   payment_method: 'epayco' (solo Epayco para regalos)
   * }
   */
  createDirectGiftOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as any;
      const senderId = requestWithUser.user?.id;
      
      if (!senderId) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'Debes estar autenticado para enviar regalos'));
      }

      const { variant_id, quantity, recipient_id, email, payment_method } = req.body;

      // Validaciones
      if (!variant_id || !recipient_id || !email || !payment_method) {
        throw new BadRequestError('Faltan campos requeridos: variant_id, recipient_id, email, payment_method');
      }

      if (payment_method !== 'epayco') {
        throw new BadRequestError('Los regalos solo se pueden pagar con Epayco');
      }

      if (!quantity || quantity < 1) {
        throw new BadRequestError('La cantidad debe ser mayor a 0');
      }

      console.log(`🎁 [CHECKOUT] Solicitud de regalo directo recibida:`, {
        variant_id,
        quantity,
        recipient_id,
        sender_id: senderId,
        email,
        payment_method,
      });

      const result = await this.checkoutService.createDirectGiftOrder({
        variantId: variant_id,
        quantity: quantity || 1,
        recipientId: recipient_id,
        senderId,
        email,
        paymentMethod: payment_method,
      });

      res.status(200).json(successResponse(result));
    } catch (error: any) {
      console.error(`❌ [CHECKOUT] Error creando orden de regalo directa:`, error);
      next(error);
    }
  };
}

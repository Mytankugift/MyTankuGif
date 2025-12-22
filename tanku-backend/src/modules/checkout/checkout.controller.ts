import { Request, Response, NextFunction } from 'express';
import { CheckoutService, CheckoutOrderRequest, DataCart } from './checkout.service';

export class CheckoutController {
  private checkoutService: CheckoutService;

  constructor() {
    this.checkoutService = new CheckoutService();
  }

  /**
   * POST /store/checkout/add-order
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
        return res.status(400).json({
          success: false,
          error: 'dataForm y dataCart son requeridos',
        });
      }

      // Obtener userId del request (puede venir de auth middleware)
      const userId = (req as any).user?.id;

      console.log(`📝 [CHECKOUT] Recibida solicitud de creación de orden`);
      console.log(`📝 [CHECKOUT] Email: ${dataForm.email}`);
      console.log(`📝 [CHECKOUT] Payment method: ${dataForm.payment_method}`);

      const order = await this.checkoutService.createOrderFromCheckout(
        dataForm,
        dataCart,
        userId
      );

      // Formatear respuesta compatible con el frontend
      res.status(201).json({
        success: true,
        order: {
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
          items: order.items.map((item) => ({
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
        },
      });
    } catch (error: any) {
      console.error(`❌ [CHECKOUT] Error creando orden:`, error);
      next(error);
    }
  };
}

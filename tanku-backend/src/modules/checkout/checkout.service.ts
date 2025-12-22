import { prisma } from '../../config/database';
import { OrdersService, CreateOrderInput } from '../orders/orders.service';
import { DropiOrdersService } from '../orders/dropi-orders.service';
import { CartService } from '../cart/cart.service';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError';

export interface CheckoutOrderRequest {
  shipping_address: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    company?: string;
    postal_code?: string;
    city?: string;
    country_code?: string;
    province?: string;
    phone?: string;
  };
  billing_address?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    company?: string;
    postal_code?: string;
    city?: string;
    country_code?: string;
    province?: string;
    phone?: string;
  };
  email: string;
  payment_method: string;
  cart_id?: string;
}

export interface DataCart {
  customer_id: string;
  cart_id: string;
  producVariants: Array<{
    variant_id: string;
    quantity: number;
    original_total: number;
    unit_price: number;
  }>;
}

export class CheckoutService {
  private ordersService: OrdersService;
  private dropiOrdersService: DropiOrdersService;
  private cartService: CartService;

  constructor() {
    this.ordersService = new OrdersService();
    this.dropiOrdersService = new DropiOrdersService();
    this.cartService = new CartService();
  }

  /**
   * Crear orden desde checkout
   * 
   * @param dataForm - Datos del formulario de checkout
   * @param dataCart - Datos del carrito
   * @param userId - ID del usuario (opcional, puede venir de auth)
   * @returns Orden creada
   */
  async createOrderFromCheckout(
    dataForm: CheckoutOrderRequest,
    dataCart: DataCart,
    userId?: string
  ) {
    console.log(`📝 [CHECKOUT] Creando orden desde checkout...`);
    console.log(`📝 [CHECKOUT] Payment method: ${dataForm.payment_method}`);
    console.log(`📝 [CHECKOUT] Cart ID: ${dataCart.cart_id}`);

    // Validar que el carrito existe y obtener sus items
    const cart = await this.cartService.getCartById(dataCart.cart_id);
    if (!cart) {
      throw new NotFoundError(`Carrito ${dataCart.cart_id} no encontrado`);
    }

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestError('El carrito está vacío');
    }

    // Usar userId del parámetro o del dataCart
    const finalUserId = userId || dataCart.customer_id;
    if (!finalUserId) {
      throw new BadRequestError('userId o customer_id es requerido');
    }

    // Mapear items del carrito a items de la orden
    const orderItems = cart.items.map((item) => {
      if (!item.variant || !item.product) {
        throw new BadRequestError(
          `Item ${item.id} no tiene variant o product asociado`
        );
      }

      // Obtener el precio BASE (sin incremento) desde el variant
      // El unit_price del cart ya tiene el incremento, pero necesitamos el precio base
      const basePrice = item.variant.suggestedPrice || item.variant.price || 0;

      return {
        productId: item.product.id,
        variantId: item.variant.id,
        quantity: item.quantity,
        price: Math.round(basePrice), // Precio base sin incremento
      };
    });

    // Calcular totales
    // El unit_price que viene del backend ya tiene el incremento aplicado (15% + $10,000)
    // No necesitamos aplicar el incremento nuevamente
    const subtotal = cart.subtotal || cart.items.reduce(
      (sum, item) => sum + (item.unit_price || 0) * item.quantity,
      0
    );
    const shippingTotal = 0; // Se actualizará con la respuesta de Dropi
    const total = subtotal + shippingTotal;
    
    const totalQuantity = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    console.log(`💰 [CHECKOUT] Totales calculados:`, {
      subtotal,
      shippingTotal,
      total,
      totalQuantity,
    });

    // Mapear dirección de envío
    const shippingAddress = dataForm.shipping_address;
    const billingAddress = dataForm.billing_address || shippingAddress;

    // Crear orden en nuestro backend
    // Para contra entrega, el payment_status debe ser "not_paid" inicialmente
    const initialPaymentStatus = dataForm.payment_method === 'cash_on_delivery' 
      ? 'not_paid' 
      : 'awaiting';

    const orderInput: CreateOrderInput = {
      userId: finalUserId,
      email: dataForm.email,
      paymentMethod: dataForm.payment_method,
      total: Math.round(total), // total = subtotal + shippingTotal (subtotal ya incluye los $10,000)
      subtotal: Math.round(subtotal), // subtotal ya incluye los $10,000 de prueba
      shippingTotal: Math.round(shippingTotal), // Se actualizará con la respuesta de Dropi
      address: {
        firstName: shippingAddress.first_name || '',
        lastName: shippingAddress.last_name || '',
        phone: shippingAddress.phone || '',
        address1: shippingAddress.address_1 || '',
        detail: shippingAddress.address_2 || undefined,
        city: shippingAddress.city || '',
        state: shippingAddress.province || '',
        postalCode: shippingAddress.postal_code || '',
        country: shippingAddress.country_code || 'CO',
      },
      items: orderItems,
      metadata: {
        cart_id: dataCart.cart_id,
        billing_address: billingAddress,
      },
    };

    console.log(`📝 [CHECKOUT] Creando orden en backend...`);
    const order = await this.ordersService.createOrder(orderInput);

    console.log(`✅ [CHECKOUT] Orden creada: ${order.id}`, {
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });

    // Si es contra entrega, crear orden en Dropi inmediatamente
    if (dataForm.payment_method === 'cash_on_delivery') {
      console.log(`📦 [CHECKOUT] Creando orden en Dropi (contra entrega)...`);
      try {
        const dropiResult = await this.dropiOrdersService.createOrderInDropi(
          order.id
        );

        if (dropiResult.success && dropiResult.dropiOrderIds.length > 0) {
          console.log(
            `✅ [CHECKOUT] Orden creada en Dropi: ${dropiResult.dropiOrderIds.join(', ')}`
          );
        } else {
          console.warn(
            `⚠️ [CHECKOUT] Error creando orden en Dropi:`,
            dropiResult.errors
          );
        }
      } catch (dropiError: any) {
        // No fallar la orden si Dropi falla, pero loguear el error
        console.error(
          `❌ [CHECKOUT] Error creando orden en Dropi:`,
          dropiError?.message
        );
      }
    }
    // Si es ePayco, la orden en Dropi se creará después del webhook

    // Eliminar todos los items del carrito después de crear la orden
    try {
      console.log(`🧹 [CHECKOUT] Eliminando items del carrito: ${dataCart.cart_id}`);
      const cart = await this.cartService.getCartById(dataCart.cart_id);
      if (cart && cart.items.length > 0) {
        // Eliminar cada item del carrito
        for (const item of cart.items) {
          try {
            await this.cartService.deleteCartItem(dataCart.cart_id, item.id);
          } catch (deleteError) {
            console.warn(`⚠️ [CHECKOUT] Error eliminando item ${item.id}:`, deleteError);
          }
        }
        console.log(`✅ [CHECKOUT] Carrito vaciado exitosamente`);
      }
    } catch (cartError: any) {
      // No fallar la orden si falla la limpieza del carrito
      console.warn(`⚠️ [CHECKOUT] Error limpiando carrito:`, cartError?.message);
    }

    return order;
  }
}

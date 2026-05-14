import { prisma } from '../../config/database';
import { OrdersService, CreateOrderInput } from '../orders/orders.service';
import { DropiOrdersService } from '../orders/dropi-orders.service';
import { CartService } from '../cart/cart.service';
import { GiftService } from '../gifts/gift.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError';
import { assertProductViewableForUser } from '../../shared/catalog/catalog-age-policy';
import { assertGiftProductAllowedForRecipient, getBirthDateForUserId } from '../../shared/catalog/catalog-age-viewer';
import type { Prisma } from '@prisma/client';

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
  /** Mensaje opcional del remitente; solo regalos. Máx. 500 caracteres al persistir. */
  gift_message?: string;
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
  private giftService: GiftService;
  private notificationsService: NotificationsService;

  constructor() {
    this.ordersService = new OrdersService();
    this.dropiOrdersService = new DropiOrdersService();
    this.cartService = new CartService();
    this.giftService = new GiftService();
    this.notificationsService = new NotificationsService();
  }

  /**
   * Preparar datos para Epayco (NO crea orden, solo guarda datos temporalmente)
   * 
   * @param dataForm - Datos del formulario de checkout
   * @param dataCart - Datos del carrito
   * @param userId - ID del usuario (opcional, puede venir de auth)
   * @returns Datos preparados para Epayco
   */
  async prepareEpaycoCheckout(
    dataForm: CheckoutOrderRequest,
    dataCart: DataCart,
    userId?: string
  ) {
    console.log(`📝 [CHECKOUT] Preparando datos para Epayco...`);
    console.log(`📝 [CHECKOUT] Payment method: ${dataForm.payment_method}`);
    console.log(`📝 [CHECKOUT] Cart ID: ${dataCart.cart_id}`);

    // Validar que el carrito existe
    let cart = await this.cartService.getCartById(dataCart.cart_id);
    if (!cart) {
      throw new NotFoundError(`Carrito ${dataCart.cart_id} no encontrado`);
    }

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestError('El carrito está vacío');
    }

    // Usar userId del parámetro (debe venir de auth middleware ahora)
    const finalUserId = userId;
    if (!finalUserId) {
      throw new BadRequestError('userId es requerido. Debes estar autenticado para completar el checkout.');
    }

    // Si el carrito no tiene userId (carrito guest), asociarlo al usuario
    if (!cart.userId && finalUserId) {
      console.log(`🔄 [CHECKOUT] Asociando carrito guest ${cart.id} al usuario ${finalUserId} antes de preparar Epayco...`);
      await prisma.cart.update({
        where: { id: cart.id },
        data: { userId: finalUserId },
      });
      console.log(`✅ [CHECKOUT] Carrito guest asociado exitosamente`);
      
      // Re-obtener el carrito actualizado
      const updatedCart = await this.cartService.getCartById(cart.id);
      if (updatedCart) {
        cart = updatedCart;
      }
    }

    // Filtrar items del carrito usando solo los variantIds seleccionados de dataCart
    const selectedVariantIds = dataCart.producVariants?.map((pv: any) => pv.variant_id) || [];
    
    // Si hay variantIds seleccionados, filtrar el carrito; si no, usar todos los items
    const itemsToProcess = selectedVariantIds.length > 0
      ? cart.items.filter(item => selectedVariantIds.includes(item.variant_id))
      : cart.items;
    
    if (itemsToProcess.length === 0) {
      throw new BadRequestError('No hay items seleccionados para procesar');
    }

    // Calcular totales usando solo los items seleccionados
    const subtotal = itemsToProcess.reduce(
      (sum, item) => {
        const cartVariant = dataCart.producVariants?.find(
          (pv: any) => pv.variant_id === item.variant_id
        );
        const finalPrice = cartVariant?.unit_price || item.unit_price || 0;
        return sum + finalPrice * item.quantity;
      },
      0
    );
    const shippingTotal = 0; // Se actualizará con la respuesta de Dropi
    const total = subtotal + shippingTotal;

    // Guardar datos del checkout en metadata del carrito para uso posterior en el webhook
    // Incluir variantIds seleccionados para poder eliminar solo esos items después
    
    await prisma.cart.update({
      where: { id: dataCart.cart_id },
      data: {
        metadata: {
          checkout_data: {
            dataForm,
            dataCart: {
              ...dataCart,
              customer_id: finalUserId,
            },
            userId: finalUserId,
            selectedVariantIds, // Guardar variantIds seleccionados
            total,
            subtotal,
            shippingTotal,
            preparedAt: new Date().toISOString(),
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      cartId: dataCart.cart_id,
      total,
      subtotal,
      shippingTotal,
    };
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
    let cart = await this.cartService.getCartById(dataCart.cart_id);
    if (!cart) {
      throw new NotFoundError(`Carrito ${dataCart.cart_id} no encontrado`);
    }

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestError('El carrito está vacío');
    }

    // Obtener carrito completo de Prisma para verificar si es carrito de regalos
    const cartFromDb = await prisma.cart.findUnique({
      where: { id: dataCart.cart_id },
      select: {
        isGiftCart: true,
        giftRecipientId: true,
      },
    });

    const isGiftCart = cartFromDb?.isGiftCart || false;
    const giftRecipientId = cartFromDb?.giftRecipientId || null;

    // Usar userId del parámetro (debe venir de auth middleware ahora)
    const finalUserId = userId;
    if (!finalUserId) {
      throw new BadRequestError('userId es requerido. Debes estar autenticado para completar el checkout.');
    }

    // Si es carrito de regalos, validar y obtener dirección del destinatario
    if (isGiftCart) {
      if (!giftRecipientId) {
        throw new BadRequestError('El carrito de regalos no tiene un destinatario configurado');
      }

      // Validar que el destinatario puede recibir regalos y que el remitente puede enviar
      const eligibility = await this.giftService.validateGiftRecipient(giftRecipientId, finalUserId);
      if (!eligibility.canReceive) {
        throw new BadRequestError(eligibility.reason || 'El destinatario no puede recibir regalos');
      }
      if (eligibility.canSendGift === false) {
        throw new BadRequestError(eligibility.sendGiftReason || 'No puedes enviar regalos a este usuario');
      }

      // NO permitir contraentrega para regalos
      if (dataForm.payment_method === 'cash_on_delivery') {
        throw new BadRequestError('Los regalos solo se pueden pagar con Epayco. El método de pago contraentrega no está disponible para regalos.');
      }

      // Obtener dirección del destinatario (sin mostrarla al remitente)
      const giftAddress = await this.giftService.getGiftAddress(giftRecipientId);
      if (!giftAddress) {
        throw new BadRequestError('El destinatario no tiene una dirección configurada para recibir regalos');
      }

      // Usar dirección del destinatario para el envío
      // Sobrescribir shippingAddress con la dirección del destinatario
      dataForm.shipping_address = {
        first_name: giftAddress.firstName,
        last_name: giftAddress.lastName,
        phone: giftAddress.phone || '',
        address_1: giftAddress.address1,
        address_2: giftAddress.address2 || undefined,
        city: giftAddress.city,
        province: giftAddress.state,
        postal_code: giftAddress.postalCode,
        country_code: giftAddress.country,
      };
    }

    // Si el carrito no tiene userId (carrito guest), asociarlo al usuario
    if (!cart.userId && finalUserId) {
      console.log(`🔄 [CHECKOUT] Asociando carrito guest ${cart.id} al usuario ${finalUserId} antes de crear orden...`);
      await prisma.cart.update({
        where: { id: cart.id },
        data: { userId: finalUserId },
      });
      console.log(`✅ [CHECKOUT] Carrito guest asociado exitosamente`);
      
      // Re-obtener el carrito actualizado
      const updatedCart = await this.cartService.getCartById(cart.id);
      if (updatedCart) {
        cart = updatedCart;
      }
    }

    // Filtrar items del carrito usando solo los variantIds seleccionados de dataCart
    const selectedVariantIds = dataCart.producVariants?.map((pv: any) => pv.variant_id) || [];
    
    // Si hay variantIds seleccionados, filtrar el carrito; si no, usar todos los items
    const itemsToProcess = selectedVariantIds.length > 0
      ? cart.items.filter(item => selectedVariantIds.includes(item.variant_id))
      : cart.items;
    
    if (itemsToProcess.length === 0) {
      throw new BadRequestError('No hay items seleccionados para procesar');
    }

    // Mapear items seleccionados del carrito a items de la orden
    const orderItems = itemsToProcess.map((item) => {
      if (!item.variant || !item.product) {
        throw new BadRequestError(
          `Item ${item.id} no tiene variant o product asociado`
        );
      }

      // Buscar el precio unitario desde dataCart.producVariants si está disponible
      // Esto asegura que usamos el precio correcto del resumen de pedido
      const cartVariant = dataCart.producVariants?.find(
        (pv: any) => pv.variant_id === item.variant_id
      );
      
      // Usar unit_price del dataCart si está disponible, sino del cart item
      const finalPrice = cartVariant?.unit_price || item.unit_price || 0;

      return {
        productId: item.product.id,
        variantId: item.variant.id,
        quantity: item.quantity,
        price: Math.round(finalPrice), // Precio final (tankuPrice) ya calculado
      };
    });

    // Calcular totales usando solo los items seleccionados
    // El unit_price que viene del backend ya tiene el incremento aplicado (15% + $10,000)
    // No necesitamos aplicar el incremento nuevamente
    const subtotal = itemsToProcess.reduce(
      (sum, item) => {
        const cartVariant = dataCart.producVariants?.find(
          (pv: any) => pv.variant_id === item.variant_id
        );
        const finalPrice = cartVariant?.unit_price || item.unit_price || 0;
        return sum + finalPrice * item.quantity;
      },
      0
    );
    const shippingTotal = 0; // Se actualizará con la respuesta de Dropi
    const total = subtotal + shippingTotal;
    
    const totalQuantity = itemsToProcess.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
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

    const giftMessageRaw =
      typeof dataForm.gift_message === 'string' ? dataForm.gift_message.trim().slice(0, 500) : '';
    const giftMessagePersist = isGiftCart && giftMessageRaw ? giftMessageRaw : undefined;

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
      isGiftOrder: isGiftCart,
      giftSenderId: isGiftCart ? finalUserId : undefined,
      giftRecipientId: isGiftCart ? giftRecipientId || undefined : undefined,
      metadata: {
        cart_id: dataCart.cart_id,
        billing_address: billingAddress,
        isGiftCart: isGiftCart,
        ...(giftMessagePersist ? { giftMessage: giftMessagePersist } : {}),
      },
    };

    console.log(`📝 [CHECKOUT] Creando orden en backend...`);
    const order = await this.ordersService.createOrder(orderInput);

    console.log(`✅ [CHECKOUT] Orden creada: ${order.id}`, {
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });

    // Si es orden de regalo, crear notificación para el destinatario
    if (isGiftCart && giftRecipientId) {
      try {
        console.log(`🎁 [CHECKOUT] Creando notificación de regalo para destinatario: ${giftRecipientId}`);
        await this.notificationsService.createGiftNotification(
          giftRecipientId,
          order.id,
          finalUserId
        );
        console.log(`✅ [CHECKOUT] Notificación de regalo creada exitosamente`);
      } catch (notificationError: any) {
        // No fallar la creación de la orden si la notificación falla
        console.error(`⚠️ [CHECKOUT] Error creando notificación de regalo:`, notificationError?.message);
      }
    }

    // Si es contra entrega, crear orden en Dropi inmediatamente
    if (dataForm.payment_method === 'cash_on_delivery') {
      console.log(`📦 [CHECKOUT] Creando orden en Dropi (contra entrega)...`);
      let dropiSuccess = false;
      try {
        const dropiResult = await this.dropiOrdersService.createOrderInDropi(
          order.id
        );

        if (dropiResult.success && dropiResult.dropiOrderIds.length > 0) {
          dropiSuccess = true;
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
        console.error(
          `❌ [CHECKOUT] Error creando orden en Dropi:`,
          dropiError?.message
        );
      }

      // Vaciar carrito SOLO si Dropi fue exitoso y solo los items seleccionados
      if (dropiSuccess) {
        try {
          console.log(`🧹 [CHECKOUT] Eliminando items seleccionados del carrito: ${dataCart.cart_id}`);
          const cart = await this.cartService.getCartById(dataCart.cart_id);
          
          // Obtener variantIds de los items seleccionados
          const selectedVariantIds = dataCart.producVariants?.map((pv: any) => pv.variant_id) || [];
          
          if (cart && cart.items.length > 0 && selectedVariantIds.length > 0) {
            // Filtrar items que coincidan con los variantIds seleccionados
            const itemsToDelete = cart.items.filter(item => 
              selectedVariantIds.includes(item.variant_id)
            );
            
            for (const item of itemsToDelete) {
              try {
                await this.cartService.deleteCartItem(dataCart.cart_id, item.id);
              } catch (deleteError) {
                console.warn(`⚠️ [CHECKOUT] Error eliminando item ${item.id}:`, deleteError);
              }
            }
            console.log(`✅ [CHECKOUT] ${itemsToDelete.length} items seleccionados eliminados del carrito`);
          }
        } catch (cartError: any) {
          console.warn(`⚠️ [CHECKOUT] Error limpiando carrito:`, cartError?.message);
        }
      } else {
        console.warn(`⚠️ [CHECKOUT] NO se vació el carrito porque Dropi falló`);
      }
      
      // Obtener la orden actualizada para verificar dropiOrderIds
      const updatedOrder = await this.ordersService.getOrderById(order.id);
      // OrderResponse no tiene metadata, pero podemos obtener dropiOrderIds directamente del objeto
      const dropiOrderIds = (updatedOrder as any).metadata?.dropi_order_ids || updatedOrder.dropiOrderIds || [];
      
      // Retornar orden con información de Dropi
      return {
        ...order,
        dropiSuccess,
        dropiOrderIds,
      } as any;
    }
    // Si es ePayco, NO vaciar el carrito aquí. El carrito se vaciará cuando Epayco confirme el pago.
    // La orden en Dropi se creará después del webhook cuando el pago sea exitoso.

    return order;
  }

  /**
   * Crear orden de regalo directamente sin carrito (desde wishlist)
   * 
   * @param input - Datos del regalo directo
   * @returns Datos preparados para Epayco o orden creada
   */
  async createDirectGiftOrder(input: {
    variantId: string;
    quantity: number;
    recipientId: string;
    senderId: string;
    email: string;
    paymentMethod: string;
  }) {
    console.log(`🎁 [CHECKOUT] Creando orden de regalo directa desde wishlist...`);
    console.log(`🎁 [CHECKOUT] Variant ID: ${input.variantId}`);
    console.log(`🎁 [CHECKOUT] Recipient ID: ${input.recipientId}`);
    console.log(`🎁 [CHECKOUT] Sender ID: ${input.senderId}`);

    // 1. Validar que el destinatario puede recibir regalos
    const eligibility = await this.giftService.validateGiftRecipient(
      input.recipientId, 
      input.senderId
    );
    
    if (!eligibility.canReceive) {
      throw new BadRequestError(eligibility.reason || 'El destinatario no puede recibir regalos');
    }
    
    if (eligibility.canSendGift === false) {
      throw new BadRequestError(eligibility.sendGiftReason || 'No puedes enviar regalos a este usuario');
    }

    // 2. Validar método de pago (solo Epayco para regalos)
    if (input.paymentMethod !== 'epayco') {
      throw new BadRequestError('Los regalos solo se pueden pagar con Epayco');
    }

    // 3. Obtener información del producto/variante
    const variant = await prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
            restrictToAdults: true,
            category: { select: { restrictToAdults: true } },
          },
        },
        warehouseVariants: {
          select: { stock: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundError('Variante no encontrada');
    }

    if (!variant.product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // 4. Validar stock (sumar todos los warehouseVariants)
    const totalStock = variant.warehouseVariants?.reduce(
      (sum, wv) => sum + (wv.stock || 0),
      0
    ) || 0;
    if (totalStock <= 0) {
      throw new BadRequestError('Este producto está agotado y no está disponible para regalo');
    }
    if (totalStock < input.quantity) {
      throw new BadRequestError(`Stock insuficiente. Disponible: ${totalStock}, Solicitado: ${input.quantity}`);
    }

    const senderBirth = await getBirthDateForUserId(input.senderId);
    assertProductViewableForUser(
      { restrictToAdults: variant.product.restrictToAdults },
      variant.product.category,
      true,
      senderBirth,
    );
    await assertGiftProductAllowedForRecipient(
      { restrictToAdults: variant.product.restrictToAdults },
      variant.product.category,
      input.recipientId,
    );

    // 5. Obtener dirección del destinatario
    const giftAddress = await this.giftService.getGiftAddress(input.recipientId);
    if (!giftAddress) {
      throw new BadRequestError('El destinatario no tiene una dirección configurada para recibir regalos');
    }

    // 6. Calcular precio (tankuPrice)
    const tankuPrice = variant.tankuPrice || variant.price || 0;
    if (tankuPrice <= 0) {
      throw new BadRequestError('El producto no tiene un precio válido');
    }

    const subtotal = Math.round(tankuPrice * input.quantity);
    const shippingTotal = 0; // Se calculará después con Dropi
    const total = subtotal + shippingTotal;

    console.log(`💰 [CHECKOUT] Precio calculado:`, {
      tankuPrice,
      quantity: input.quantity,
      subtotal,
      total,
    });

    // 7. Crear orden directamente (sin carrito)
    const orderInput: CreateOrderInput = {
      userId: input.senderId,
      email: input.email,
      paymentMethod: input.paymentMethod,
      total: Math.round(total),
      subtotal: Math.round(subtotal),
      shippingTotal: Math.round(shippingTotal),
      address: {
        firstName: giftAddress.firstName,
        lastName: giftAddress.lastName,
        phone: giftAddress.phone || '',
        address1: giftAddress.address1,
        detail: giftAddress.address2 || undefined,
        city: giftAddress.city,
        state: giftAddress.state,
        postalCode: giftAddress.postalCode,
        country: giftAddress.country,
      },
      items: [{
        productId: variant.productId,
        variantId: variant.id,
        quantity: input.quantity,
        price: Math.round(tankuPrice),
      }],
      isGiftOrder: true, // ✅ Marcar como regalo
      giftSenderId: input.senderId, // ✅ Quien compra
      giftRecipientId: input.recipientId, // ✅ Dueño de la wishlist
      metadata: {
        source: 'wishlist_direct', // Para identificar que vino de wishlist
        wishlist_purchase: true,
      },
    };

    // 8. Crear orden
    console.log(`📝 [CHECKOUT] Creando orden de regalo directa...`);
    const order = await this.ordersService.createOrder(orderInput);

    console.log(`✅ [CHECKOUT] Orden de regalo creada: ${order.id}`, {
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      isGiftOrder: true,
      giftSenderId: input.senderId,
      giftRecipientId: input.recipientId,
    });

    // 9. NOTA: La notificación se creará cuando el pago sea confirmado en el webhook
    // No crear notificación aquí porque el pago aún no está confirmado

    // 10. Si es Epayco, retornar datos para el checkout
    // La orden ya está creada con paymentStatus: 'awaiting'
    // El webhook actualizará el paymentStatus cuando se confirme el pago
    if (input.paymentMethod === 'epayco') {
      return {
        orderId: order.id, // ✅ Usar orderId en lugar de cartId
        total: order.total,
        subtotal: order.subtotal,
        shippingTotal: order.shippingTotal,
        paymentMethod: 'epayco',
        message: 'Orden de regalo creada. El pago se procesará a través de Epayco.',
        productInfo: {
          product: {
            id: variant.product.id,
            title: variant.product.title,
            thumbnail: variant.product.images?.[0] || null,
          },
          variant: {
            id: variant.id,
            title: variant.title,
          },
          price: Math.round(tankuPrice),
        },
      };
    }

    // Para contra entrega (aunque no debería llegar aquí para regalos)
    return order;
  }
}

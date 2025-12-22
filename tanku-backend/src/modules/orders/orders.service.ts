import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import type { Prisma } from '@prisma/client';

export interface CreateOrderInput {
  userId: string;
  email: string;
  paymentMethod: string;
  total: number;
  subtotal: number;
  shippingTotal?: number;
  address: {
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    detail?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
  }>;
  isStalkerGift?: boolean;
  metadata?: Record<string, any>;
}

export interface OrderResponse {
  id: string;
  userId: string;
  email: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  subtotal: number;
  shippingTotal: number;
  dropiOrderIds: number[]; // Array de IDs de Dropi (uno por OrderItem)
  isStalkerGift: boolean;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  address: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
    finalPrice?: number;
    dropiOrderId?: number | null;
    dropiOrderNumber?: string | null;
    dropiShippingCost?: number | null;
    dropiStatus?: string | null;
    product: {
      id: string;
      title: string;
      handle: string;
    };
    variant: {
      id: string;
      sku: string;
      title: string;
      price: number;
    };
  }>;
}

export class OrdersService {
  /**
   * Crear una nueva orden
   */
  async createOrder(input: CreateOrderInput): Promise<OrderResponse> {
    console.log(`📝 [ORDERS] Creando orden para usuario: ${input.userId}`);

    // Validar items
    if (!input.items || input.items.length === 0) {
      throw new BadRequestError('La orden debe tener al menos un item');
    }

    // Calcular subtotal usando finalPrice (precio * 1.15 + $10,000)
    const calculatedSubtotal = input.items.reduce(
      (sum, item) => {
        // Fórmula: (precio * 1.15) + 10,000
        const finalPrice = Math.round((item.price * 1.15) + 10000);
        return sum + (finalPrice * item.quantity);
      },
      0
    );

    if (Math.abs(calculatedSubtotal - input.subtotal) > 1) {
      console.warn(
        `⚠️ [ORDERS] Subtotal calculado (${calculatedSubtotal}) no coincide con el proporcionado (${input.subtotal})`
      );
    }

    // Determinar paymentStatus inicial según método de pago
    // Para contra entrega: not_paid (se pagará al recibir)
    // Para ePayco: awaiting (esperando pago)
    const initialPaymentStatus = input.paymentMethod === 'cash_on_delivery' 
      ? 'not_paid' 
      : 'awaiting';

    // Crear orden primero (sin dirección)
    const order = await prisma.order.create({
      data: {
        email: input.email,
        paymentMethod: input.paymentMethod,
        paymentStatus: initialPaymentStatus,
        total: calculatedSubtotal + (input.shippingTotal || 0), // Total = subtotal + shipping
        subtotal: calculatedSubtotal, // Usar subtotal calculado con incremento
        shippingTotal: input.shippingTotal || 0,
        isStalkerGift: input.isStalkerGift || false,
        metadata: input.metadata as Prisma.InputJsonValue | undefined || undefined,
      
        user: {
          connect: {
            id: input.userId,
          },
        },
      
        items: {
          create: input.items.map((item) => {
            // Fórmula: (precio * 1.15) + 10,000
            const finalPrice = Math.round((item.price * 1.15) + 10000);
            
            return {
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price, // Precio base
              finalPrice: finalPrice, // Precio con incremento (15% + $10,000)
            };
          }),
        },
      },
      include: {
        orderAddresses: {
          include: {
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                title: true,
                price: true,
              },
            },
          },
        },
      } as any,
    });

    // Buscar si ya existe una dirección con los mismos datos para este usuario
    // Si existe, reutilizarla; si no, crear una nueva
    let address = await prisma.address.findFirst({
      where: {
        userId: input.userId,
        address1: input.address.address1,
        city: input.address.city,
        state: input.address.state,
        postalCode: input.address.postalCode,
      },
    });

    // Si no existe, crear una nueva dirección
    if (!address) {
      address = await prisma.address.create({
        data: {
          userId: input.userId,
          firstName: input.address.firstName,
          lastName: input.address.lastName,
          phone: input.address.phone,
          address1: input.address.address1,
          detail: input.address.detail || null,
          city: input.address.city,
          state: input.address.state,
          postalCode: input.address.postalCode,
          country: input.address.country || 'CO',
          isDefaultShipping: false,
        },
      });
    } else {
      // Si existe, actualizar datos si han cambiado
      address = await prisma.address.update({
        where: { id: address.id },
        data: {
          firstName: input.address.firstName,
          lastName: input.address.lastName,
          phone: input.address.phone,
          detail: input.address.detail || address.detail,
        },
      });
    }

    // Crear relación entre la orden y la dirección (many-to-many)
    // Usar cast temporal hasta que TypeScript reconozca el modelo regenerado
    await (prisma as any).orderAddress.create({
      data: {
        orderId: order.id,
        addressId: address.id,
      },
    });

    // Obtener orden completa con dirección
    const orderWithAddress = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderAddresses: {
          include: {
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                title: true,
                price: true,
              },
            },
          },
        },
      } as any,
    });

    console.log(`✅ [ORDERS] Orden creada: ${order.id}`);

    return this.formatOrderResponse(orderWithAddress!);
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(orderId: string, userId?: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderAddresses: {
          include: {
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                title: true,
                price: true,
              },
            },
          },
        },
      } as any,
    });

    if (!order) {
      throw new NotFoundError(`Orden ${orderId} no encontrada`);
    }

    // Verificar que el usuario tenga acceso a esta orden
    if (userId && order.userId !== userId) {
      throw new BadRequestError('No tienes permiso para ver esta orden');
    }

    return this.formatOrderResponse(order);
  }

  /**
   * Obtener historial de órdenes de un usuario
   */
  async getUserOrders(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    orders: OrderResponse[];
    total: number;
    hasMore: boolean;
  }> {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: {
          orderAddresses: {
            include: {
              address: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  handle: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  sku: true,
                  title: true,
                  price: true,
                },
              },
            },
          },
        } as any,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return {
      orders: orders.map((order) => this.formatOrderResponse(order)),
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Actualizar estado de pago de una orden
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: string,
    transactionId?: string
  ): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        transactionId: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Orden ${orderId} no encontrada`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        transactionId: transactionId || order.transactionId,
        // Si el pago es exitoso, actualizar status a CONFIRMED
        status:
          paymentStatus === 'captured' || paymentStatus === 'paid'
            ? 'CONFIRMED'
            : order.status,
      },
      include: {
        orderAddresses: {
          include: {
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                title: true,
                price: true,
              },
            },
          },
        },
      } as any,
    });

    console.log(
      `✅ [ORDERS] Estado de pago actualizado: ${orderId} -> ${paymentStatus}`
    );

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Actualizar dropiOrderId después de crear la orden en Dropi
   * @deprecated Este método ya no se usa, la información de Dropi se guarda en OrderItem
   */
  async updateDropiOrderId(
    orderId: string,
    dropiOrderId: number
  ): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError(`Orden ${orderId} no encontrada`);
    }

    // Ya no actualizamos dropiOrderId en Order, se guarda en OrderItem
    // Este método está deprecado pero se mantiene por compatibilidad
    const updatedOrder = await (prisma.order.findUnique as any)({
      where: { id: orderId },
      include: {
        orderAddresses: {
          include: {
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                title: true,
                price: true,
              },
            },
          },
        },
      },
    });

    console.log(
      `✅ [ORDERS] DropiOrderId actualizado: ${orderId} -> ${dropiOrderId}`
    );

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Formatear respuesta de orden
   */
  private formatOrderResponse(order: any): OrderResponse {
    return {
      id: order.id,
      userId: order.userId,
      email: order.email,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      subtotal: order.subtotal,
      shippingTotal: order.shippingTotal,
      dropiOrderIds: order.items?.map((item: any) => item.dropiOrderId).filter(Boolean) || [],
      isStalkerGift: order.isStalkerGift,
      transactionId: order.transactionId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      address: order.orderAddresses && order.orderAddresses.length > 0 && order.orderAddresses[0].address
        ? {
            id: order.orderAddresses[0].address.id,
            firstName: order.orderAddresses[0].address.firstName,
            lastName: order.orderAddresses[0].address.lastName,
            phone: order.orderAddresses[0].address.phone,
            address1: order.orderAddresses[0].address.address1,
            address2: order.orderAddresses[0].address.detail, // detail se mapea a address2 en OrderResponse
            city: order.orderAddresses[0].address.city,
            state: order.orderAddresses[0].address.state,
            postalCode: order.orderAddresses[0].address.postalCode,
            country: order.orderAddresses[0].address.country,
          }
        : null,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        finalPrice: item.finalPrice || Math.round((item.price * 1.15) + 10000), // Precio con incremento (15% + $10,000)
        total: (item.finalPrice || Math.round((item.price * 1.15) + 10000)) * item.quantity, // Total del item
        dropiOrderId: item.dropiOrderId,
        dropiOrderNumber: item.dropiOrderNumber,
        dropiShippingCost: item.dropiShippingCost,
        dropiStatus: item.dropiStatus,
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
  }
}

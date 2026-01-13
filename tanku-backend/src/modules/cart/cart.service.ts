import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import { CartDTO, CartItemDTO } from '../../shared/dto/cart.dto';
import type { Cart, CartItem, ProductVariant, Product } from '@prisma/client';
import { env } from '../../config/env';

// Interfaz legacy para compatibilidad temporal (se eliminará)
export interface CartResponse {
  id: string;
  userId?: string | null;
  items: Array<{
    id: string;
    variant_id: string;
    quantity: number;
    unit_price: number;
    total: number;
    product?: {
      id: string;
      title: string;
      handle: string;
      images: string[];
    };
    variant?: {
      id: string;
      sku: string;
      title: string;
      price: number;
      suggestedPrice?: number | null;
      stock: number;
    };
  }>;
  subtotal: number;
  total: number;
  region?: any;
  created_at: Date;
  updated_at: Date;
}

export class CartService {
  /**
   * LIMPIEZA DE DATOS CORRUPTOS:
   * Si existen carts con IDs inválidos (ej. "add-item", "update-item"), ejecutar:
   * 
   * DELETE FROM carts WHERE id IN ('add-item', 'update-item', ...);
   * 
   * Estos IDs inválidos se crearon cuando las rutas dinámicas (/:id) capturaban
   * rutas fijas (/add-item) antes de que se corrigiera el orden de rutas.
   */

  /**
   * Normalizar URL de imagen
   */
  private normalizeImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${cdnBase}/${cleanPath}`;
  }

  /**
   * Mapper: CartItem de Prisma a CartItemDTO
   */
  private mapCartItemToDTO(
    item: CartItem & {
      variant: ProductVariant & {
        product: Product | null;
        warehouseVariants: { stock: number }[];
      };
    }
  ): CartItemDTO {
    const totalStock = item.variant.warehouseVariants?.reduce(
      (sum, wv) => sum + (wv.stock || 0),
      0
    ) || 0;

    const basePrice = item.variant.suggestedPrice || item.variant.price || 0;
    // Aplicar incremento: (precio * 1.15) + 10,000
    const unitPrice = basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) : 0;

    return {
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
      createdAt: item.createdAt.toISOString(),
      product: item.variant.product
        ? {
            id: item.variant.product.id,
            title: item.variant.product.title,
            handle: item.variant.product.handle,
            images: (item.variant.product.images || []).map((img) => this.normalizeImageUrl(img) || ''),
          }
        : undefined,
      variant: {
        id: item.variant.id,
        sku: item.variant.sku,
        title: item.variant.title,
        price: unitPrice,
        suggestedPrice: item.variant.suggestedPrice || null,
        stock: totalStock,
      },
    };
  }

  /**
   * Mapper: Cart de Prisma a CartDTO
   */
  private mapCartToDTO(
    cart: Cart & {
      items: (CartItem & {
        variant: ProductVariant & {
          product: Product | null;
          warehouseVariants: { stock: number }[];
        };
      })[];
    }
  ): CartDTO {
    const items = cart.items.map((item) => this.mapCartItemToDTO(item));
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      subtotal,
      total: subtotal, // Por ahora total = subtotal (sin envío ni impuestos)
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  /**
   * Obtener carrito por ID (NUEVO - Normalizado)
   */
  async getCartByIdNormalized(cartId: string): Promise<CartDTO | null> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                warehouseVariants: {
                  select: {
                    stock: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return null;
    }

    return this.mapCartToDTO(cart);
  }

  /**
   * Obtener carrito del usuario autenticado (NUEVO - Normalizado)
   * Si no hay carrito del usuario, busca carritos guest y los asocia al usuario
   */
  async getUserCart(userId: string): Promise<CartDTO | null> {
    // Primero buscar carrito del usuario
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                warehouseVariants: {
                  select: {
                    stock: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Si no hay carrito del usuario, buscar carritos guest (sin userId) que tengan items
    if (!cart) {
      console.log(`📦 [CART] No hay carrito para usuario ${userId}, buscando carritos guest para asociar...`);
      const guestCarts = await prisma.cart.findMany({
        where: {
          userId: null,
          items: {
            some: {},
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  warehouseVariants: {
                    select: {
                      stock: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1, // Solo tomar el más reciente
      });

      // Si hay un carrito guest, asociarlo al usuario
      if (guestCarts.length > 0) {
        const guestCart = guestCarts[0];
        console.log(`🔄 [CART] Asociando carrito guest ${guestCart.id} al usuario ${userId}`);
        cart = await prisma.cart.update({
          where: { id: guestCart.id },
          data: { userId },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                    warehouseVariants: {
                      select: {
                        stock: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        console.log(`✅ [CART] Carrito guest asociado exitosamente`);
      }
    }

    if (!cart) {
      return null;
    }

    return this.mapCartToDTO(cart);
  }

  /**
   * Obtener carrito por ID (LEGACY - Mantener para compatibilidad)
   * @param fields - Campos opcionales para formatear respuesta (compatibilidad con SDK)
   */
  async getCartById(cartId: string, fields?: string): Promise<CartResponse | null> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                warehouseVariants: {
                  select: {
                    stock: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return null; // Retornar null en lugar de lanzar error
    }

    const items = cart.items.map((item) => {
      // Calcular stock sumando todos los warehouseVariants
      const totalStock = item.variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;

      const basePrice = item.variant.suggestedPrice || item.variant.price || 0;
      // Aplicar incremento: (precio * 1.15) + 10,000
      const unitPrice = basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) : 0;
      
      return {
        id: item.id,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: unitPrice, // Precio unitario con incremento (15% + $10,000)
        total: unitPrice * item.quantity, // Total calculado
        product: item.variant.product
          ? {
              id: item.variant.product.id,
              title: item.variant.product.title,
              handle: item.variant.product.handle,
              images: item.variant.product.images,
            }
          : undefined,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          title: item.variant.title,
          price: unitPrice, // Usar suggestedPrice como prioridad
          suggestedPrice: item.variant.suggestedPrice || null, // Incluir también suggestedPrice explícitamente
          stock: totalStock,
        },
      };
    });

    // Calcular subtotal (suma de todos los totales de items)
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      subtotal,
      total: subtotal, // Por ahora total = subtotal (sin envío ni impuestos)
      created_at: cart.createdAt,
      updated_at: cart.updatedAt,
    };
  }

  /**
   * Crear carrito nuevo (NUEVO - Normalizado)
   */
  async createCartNormalized(userId?: string): Promise<CartDTO> {
    // Si se proporciona userId, verificar que el usuario existe
    if (userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userExists) {
        console.error(`❌ [CART] Usuario ${userId} no existe en la base de datos`);
        throw new BadRequestError(`Usuario no encontrado: ${userId}`);
      }
    }

    const cart = await prisma.cart.create({
      data: {
        userId: userId || null,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                warehouseVariants: {
                  select: {
                    stock: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.mapCartToDTO(cart);
  }

  /**
   * Crear carrito nuevo (LEGACY - Mantener para compatibilidad)
   */
  async createCart(userId?: string): Promise<CartResponse> {
    const cart = await prisma.cart.create({
      data: {
        userId: userId || null,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items: [],
      subtotal: 0,
      total: 0,
      created_at: cart.createdAt,
      updated_at: cart.updatedAt,
    };
  }

  /**
   * Agregar item al carrito (NUEVO - Normalizado)
   * 
   * REGLAS CRÍTICAS:
   * 1. El backend SIEMPRE controla cart.id (nunca usar IDs del request)
   * 2. Si el cart no existe, crear uno nuevo (sin ID manual)
   * 3. Validar variant existe y está activa
   * 4. Validar stock suficiente
   * 5. Si el item ya existe, sumar quantity (usar update)
   * 6. Si no existe, crear nuevo CartItem
   */
  async addItemToCartNormalized(
    cartId: string,
    variantId: string,
    quantity: number,
    userId?: string
  ): Promise<CartDTO> {
    // Reutilizar lógica existente pero retornar DTO
    const cartResponse = await this.addItemToCart(cartId, variantId, quantity, userId);
    const cart = await prisma.cart.findUnique({
      where: { id: cartResponse.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                warehouseVariants: {
                  select: {
                    stock: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new Error('Error al obtener carrito actualizado');
    }

    return this.mapCartToDTO(cart);
  }

  /**
   * Agregar item al carrito (LEGACY - Mantener para compatibilidad)
   * 
   * REGLAS CRÍTICAS:
   * 1. El backend SIEMPRE controla cart.id (nunca usar IDs del request)
   * 2. Si el cart no existe, crear uno nuevo (sin ID manual)
   * 3. Validar variant existe y está activa
   * 4. Validar stock suficiente
   * 5. Si el item ya existe, sumar quantity (usar update)
   * 6. Si no existe, crear nuevo CartItem
   */
  async addItemToCart(
    cartId: string,
    variantId: string,
    quantity: number,
    userId?: string
  ): Promise<CartResponse> {
    // 1. Buscar Cart por cartId
    let cart = await prisma.cart.findUnique({
      where: { id: cartId },
    });

    // 2. Si no existe → crear cart nuevo (sin ID manual - el backend controla el ID)
    if (!cart) {
      console.log(`🛒 [CART-SERVICE] Cart ${cartId} no existe, creando nuevo cart...`);
      cart = await prisma.cart.create({
        data: {
          // NUNCA usar id: cartId - el backend genera el ID automáticamente
          userId: userId || null, // Usar userId si está disponible
        },
      });
      console.log(`✅ [CART-SERVICE] Nuevo cart creado: ${cart.id} con userId: ${userId || 'null'}`);
    } else if (userId && !cart.userId) {
      // Si el carrito existe pero no tiene userId y ahora tenemos uno, actualizarlo
      console.log(`🛒 [CART-SERVICE] Actualizando cart ${cart.id} con userId: ${userId}`);
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: { userId },
      });
    }

    // Verificar que la variante existe
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { 
        product: true,
        warehouseVariants: {
          select: {
            stock: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundError('Variante de producto no encontrada');
    }

    if (!variant.active) {
      throw new BadRequestError('La variante no está disponible');
    }

    // Calcular stock sumando todos los warehouseVariants
    const totalStock = variant.warehouseVariants?.reduce(
      (sum, wv) => sum + (wv.stock || 0),
      0
    ) || 0;

    if (totalStock < quantity) {
      throw new BadRequestError('Stock insuficiente');
    }

    // 5. Buscar CartItem por (cartId, variantId)
    // El constraint @@unique([cartId, variantId]) previene duplicados a nivel de BD
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId: variantId,
      },
    });

    if (existingItem) {
      // 6. Si existe → sumar quantity (usar update)
      const newQuantity = existingItem.quantity + quantity;
      
      // Validar stock nuevamente con la nueva cantidad total
      if (totalStock < newQuantity) {
        throw new BadRequestError(`Stock insuficiente. Disponible: ${totalStock}, solicitado: ${newQuantity}`);
      }
      
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
        },
      });
      console.log(`✅ [CART-SERVICE] Item actualizado: id=${existingItem.id}, quantity=${existingItem.quantity} → ${newQuantity}`);
    } else {
      // 7. Si no existe → crear CartItem
      // El constraint único evitará duplicados si hay race conditions
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity,
        },
      });
      console.log(`✅ [CART-SERVICE] Item creado: cartId=${cart.id}, variantId=${variantId}, quantity=${quantity}`);
    }

    // Retornar carrito actualizado
    const updatedCart = await this.getCartById(cart.id);
    if (!updatedCart) {
      throw new Error('Error al obtener carrito actualizado');
    }
    
    console.log(`🔍 [CART-SERVICE] Carrito actualizado tiene ${updatedCart.items.length} items`);
    return updatedCart;
  }

  /**
   * Actualizar cantidad de item en el carrito (NUEVO - Normalizado)
   */
  async updateCartItemNormalized(
    cartId: string,
    itemId: string,
    quantity: number,
    userId?: string
  ): Promise<CartDTO> {
    // Reutilizar lógica existente pero retornar DTO
    const cartResponse = await this.updateCartItem(cartId, itemId, quantity, userId);
    const cart = await prisma.cart.findUnique({
      where: { id: cartResponse.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                warehouseVariants: {
                  select: {
                    stock: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new Error('Error al obtener carrito actualizado');
    }

    return this.mapCartToDTO(cart);
  }

  /**
   * Actualizar cantidad de item en el carrito (LEGACY - Mantener para compatibilidad)
   */
  async updateCartItem(
    cartId: string,
    lineId: string,
    quantity: number,
    userId?: string
  ): Promise<CartResponse> {
    if (quantity < 0) {
      throw new BadRequestError('La cantidad debe ser mayor o igual a 0');
    }

    // Verificar que el item existe y pertenece al carrito
    const item = await prisma.cartItem.findFirst({
      where: {
        id: lineId,
        cartId,
      },
      include: {
        variant: {
          include: {
            warehouseVariants: {
              select: {
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Item del carrito no encontrado');
    }

    if (quantity === 0) {
      // Eliminar item
      await prisma.cartItem.delete({
        where: { id: lineId },
      });
    } else {
      // Calcular stock sumando todos los warehouseVariants
      const totalStock = item.variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;

      // Verificar stock
      if (totalStock < quantity) {
        throw new BadRequestError('Stock insuficiente');
      }

      // Actualizar cantidad
      await prisma.cartItem.update({
        where: { id: lineId },
        data: { quantity },
      });
    }

    // Si el carrito no tiene userId y ahora tenemos uno, actualizarlo
    if (userId) {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        select: { userId: true },
      });
      
      if (cart && !cart.userId) {
        console.log(`🛒 [CART-SERVICE] Actualizando cart ${cartId} con userId: ${userId}`);
        await prisma.cart.update({
          where: { id: cartId },
          data: { userId },
        });
      }
    }

    // Retornar carrito actualizado
    const updatedCart = await this.getCartById(cartId);
    if (!updatedCart) {
      throw new Error('Error al obtener carrito actualizado');
    }
    return updatedCart;
  }

  /**
   * Eliminar item del carrito (NUEVO - Normalizado)
   */
  async deleteCartItemNormalized(
    cartId: string,
    itemId: string
  ): Promise<CartDTO> {
    // Reutilizar lógica existente pero retornar DTO
    const cartResponse = await this.deleteCartItem(cartId, itemId);
    const cart = await prisma.cart.findUnique({
      where: { id: cartResponse.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                warehouseVariants: {
                  select: {
                    stock: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new Error('Error al obtener carrito actualizado');
    }

    return this.mapCartToDTO(cart);
  }

  /**
   * Eliminar item del carrito (LEGACY - Mantener para compatibilidad)
   */
  async deleteCartItem(
    cartId: string,
    lineId: string
  ): Promise<CartResponse> {
    // Verificar que el item existe y pertenece al carrito
    const item = await prisma.cartItem.findFirst({
      where: {
        id: lineId,
        cartId,
      },
    });

    if (!item) {
      throw new NotFoundError('Item del carrito no encontrado');
    }

    // Eliminar item
    await prisma.cartItem.delete({
      where: { id: lineId },
    });

    console.log(`✅ [CART-SERVICE] Item eliminado: id=${lineId}, cartId=${cartId}`);

    // Retornar carrito actualizado
    const updatedCart = await this.getCartById(cartId);
    if (!updatedCart) {
      throw new Error('Error al obtener carrito actualizado');
    }
    return updatedCart;
  }
}

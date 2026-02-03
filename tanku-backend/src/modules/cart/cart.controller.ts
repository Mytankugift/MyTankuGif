import { Request, Response, NextFunction } from 'express';
import { CartService } from './cart.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { RequestWithUser } from '../../shared/types';
import { prisma } from '../../config/database';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  /**
   * GET /store/carts/:id
   * Obtener carrito por ID
   * Soporta query params: fields (para formatear respuesta)
   */
  getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const fields = req.query.fields as string | undefined;

      if (!id) {
        throw new BadRequestError('ID del carrito es requerido');
      }


      const cart = await this.cartService.getCartById(id, fields);

      console.log(`🔍 [CART] Carrito obtenido:`, {
        id: cart?.id,
        itemsCount: cart?.items?.length || 0,
        hasFields: !!fields,
      });

      // Si el carrito no existe, retornar 404
      // El frontend debe crear un carrito nuevo usando POST /store/carts
      if (!cart) {
        return res.status(404).json({
          message: 'Carrito no encontrado',
          cart: null,
        });
      }

      // Si hay campos específicos solicitados, formatear respuesta según campos
      if (fields) {
        // Parsear campos solicitados (formato: *items, *region, *items.product, etc.)
        const requestedFields = this.parseFields(fields);
        console.log(`🔍 [CART] Campos solicitados:`, requestedFields);
        console.log(`🔍 [CART] Carrito antes de formatear tiene ${cart.items.length} items`);
        const formattedCart = this.formatCartByFields(cart, requestedFields);
        console.log(`🔍 [CART] Carrito después de formatear tiene ${formattedCart.items?.length || 0} items`);
        return res.status(200).json({ cart: formattedCart });
      }

      // Respuesta estándar - asegurar que items siempre estén incluidos
      const cartWithItems = {
        ...cart,
        items: cart.items || [],
        subtotal: cart.subtotal || 0,
        total: cart.total || cart.subtotal || 0,
        region_id: null,
        region: null,
        shipping_methods: [],
        promotions: [],
      };

      res.status(200).json({
        cart: cartWithItems,
      });
    } catch (error) {
      console.error(`❌ [CART] Error obteniendo carrito:`, error);
      next(error);
    }
  };

  /**
   * Parsear string de campos solicitados
   */
  private parseFields(fields: string): string[] {
    return fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  /**
   * Formatear carrito según campos solicitados
   */
  private formatCartByFields(cart: any, fields: string[]): any {
    const result: any = {};

    // Campos básicos siempre incluidos
    result.id = cart.id;
    result.created_at = cart.created_at;
    result.updated_at = cart.updated_at;
    result.region_id = cart.region_id || null;

    // Verificar si se solicitan items (el * indica que se incluyen todos los campos base)
    const wantsItems = fields.some((f) => f.includes('items') || f.includes('*items'));
    if (wantsItems) {
      // Asegurar que items sea un array
      const itemsArray = Array.isArray(cart.items) ? cart.items : [];
      result.items = itemsArray.map((item: any) => {
        const itemResult: any = {
          id: item.id,
          variant_id: item.variant_id || item.variantId, // Soportar ambos formatos
          quantity: item.quantity,
        };

        // Verificar si se solicitan campos anidados (el * indica incluir todo)
        const wantsProduct = fields.some((f) => f.includes('items.product') || f.includes('*items.product'));
        if (wantsProduct) {
          // El item puede tener product directamente o a través de variant.product
          const product = item.product || (item.variant && item.variant.product);
          itemResult.product = product ? {
            id: product.id,
            title: product.title,
            handle: product.handle,
            images: product.images || [],
            description: product.description || null,
          } : null;
        }

        const wantsVariant = fields.some((f) => f.includes('items.variant') || f.includes('*items.variant'));
        if (wantsVariant) {
          // El item puede tener variant directamente
          const variant = item.variant;
          if (variant) {
            // Calcular stock desde warehouseVariants si está disponible
            let stock = 0;
            if ('warehouseVariants' in variant) {
              stock = (variant as any).warehouseVariants?.reduce(
                (sum: number, wv: any) => sum + (wv.stock || 0),
                0
              ) || 0;
            } else if ('stock' in variant) {
              stock = (variant as any).stock || 0;
            }

            // Calcular tankuPrice si no está disponible
            const tankuPrice = variant.tankuPrice || 0;
            
            itemResult.variant = {
              id: variant.id,
              sku: variant.sku,
              title: variant.title,
              tankuPrice: tankuPrice, // Precio final (tankuPrice)
              stock: stock,
              active: variant.active,
            };
          } else {
            itemResult.variant = null;
          }
        }

        const wantsThumbnail = fields.some((f) => f.includes('items.thumbnail') || f.includes('*items.thumbnail'));
        if (wantsThumbnail) {
          const product = item.product || (item.variant && item.variant.product);
          itemResult.thumbnail = product?.images?.[0] || null;
        }

        const wantsMetadata = fields.some((f) => f.includes('items.metadata') || f.includes('*items.metadata'));
        if (wantsMetadata) {
          itemResult.metadata = item.metadata || {};
        }

        // Siempre incluir unit_price (precio unitario del variant con incremento)
        const variant = item.variant;
        if (variant) {
          // Usar tankuPrice directamente (ya calculado en sync)
          const unitPrice = variant.tankuPrice || 0;
          itemResult.unit_price = unitPrice;
          
          // El + indica campo calculado
          const wantsTotal = fields.some((f) => f.includes('items.total') || f.includes('+items.total'));
          if (wantsTotal) {
            itemResult.total = unitPrice * item.quantity;
          }
        } else {
          itemResult.unit_price = 0;
          itemResult.total = 0;
        }

        return itemResult;
      });
    } else {
      // Si no se solicitan items, devolver array vacío
      result.items = [];
    }

    // Verificar si se solicita region (el * indica incluir todo)
    const wantsRegion = fields.some((f) => f.includes('region') || f.includes('*region'));
    if (wantsRegion) {
      result.region = cart.region || null;
    }

    // Verificar si se solicitan shipping_methods (el + indica campo calculado o específico)
    const wantsShippingMethods = fields.some((f) => f.includes('shipping_methods'));
    if (wantsShippingMethods) {
      result.shipping_methods = cart.shipping_methods || [];
    }

    // Verificar si se solicitan promotions (el * indica incluir todo)
    const wantsPromotions = fields.some((f) => f.includes('promotions') || f.includes('*promotions'));
    if (wantsPromotions) {
      result.promotions = cart.promotions || [];
    }

    return result;
  }

  /**
   * POST /store/carts
   * Crear carrito nuevo
   * Acepta region_id en el body
   */
  createCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;
      const { region_id } = req.body; // Aceptar pero no usar todavía


      const cart = await this.cartService.createCart(userId);

      // Formatear respuesta
      const formattedCart = {
        ...cart,
        region_id: region_id || null,
        region: null,
        shipping_methods: [],
        promotions: [],
      };

      res.status(201).json({
        cart: formattedCart,
      });
    } catch (error) {
      console.error(`❌ [CART] Error creando carrito:`, error);
      next(error);
    }
  };

  /**
   * POST /store/carts/:id
   * Actualizar carrito
   * Acepta: region_id, email, shipping_address, billing_address, etc.
   */
  updateCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData = req.body; // region_id, email, etc.


      if (!id) {
        throw new BadRequestError('ID del carrito es requerido');
      }

      // Obtener carrito actual
      const cart = await this.cartService.getCartById(id);
      
      // Si no existe, retornar 404
      // El backend NUNCA crea carts con IDs del request
      if (!cart) {
        return res.status(404).json({
          message: 'Carrito no encontrado',
          cart: null,
        });
      }

      // Formatear respuesta (por ahora solo aceptamos region_id pero no lo usamos)
      const formattedCart = {
        ...cart,
        subtotal: cart.subtotal || 0,
        total: cart.total || cart.subtotal || 0,
        region_id: updateData.region_id || null,
        region: null,
        shipping_methods: [],
        promotions: [],
      };

      res.status(200).json({
        cart: formattedCart,
      });
    } catch (error) {
      console.error(`❌ [CART] Error actualizando carrito:`, error);
      next(error);
    }
  };

  /**
   * GET /api/v1/cart/gift
   * Obtener carrito de regalos del usuario (o crear uno vacío si no existe)
   */
  getCurrentUserGiftCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;

      if (!userId) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No hay usuario autenticado',
        });
      }

      const cart = await this.cartService.getUserGiftCart(userId);

      return res.status(200).json({
        success: true,
        data: cart,
        cart: cart,
      });
    } catch (error) {
      console.error(`❌ [CART] Error obteniendo carrito de regalos:`, error);
      next(error);
    }
  };

  /**
   * POST /api/v1/cart/gift-items
   * Agregar item al carrito de regalos
   */
  addGiftItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cart_id, variant_id, quantity, recipient_id } = req.body;

      if (!variant_id) {
        throw new BadRequestError('variant_id es requerido');
      }

      if (!quantity || quantity < 1) {
        throw new BadRequestError('quantity debe ser mayor a 0');
      }

      if (!recipient_id) {
        throw new BadRequestError('recipient_id es requerido');
      }

      const requestWithUser = req as RequestWithUser;
      const senderId = requestWithUser.user?.id;

      if (!senderId) {
        throw new BadRequestError('Debes estar autenticado para enviar regalos');
      }

      console.log(`🎁 [CART] Agregando item de regalo: cart_id=${cart_id || 'null'}, variant_id=${variant_id}, quantity=${quantity}, recipient_id=${recipient_id}, sender_id=${senderId}`);

      const cart = await this.cartService.addItemToGiftCart(
        cart_id || null,
        variant_id,
        quantity,
        senderId,
        recipient_id
      );

      console.log(`✅ [CART] Item de regalo agregado. Carrito ID: ${cart.id}`);

      const response = {
        success: true,
        message: 'Item agregado al carrito de regalos',
        data: cart,
        cart: cart,
        cart_id: cart.id,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error(`❌ [CART] Error agregando item de regalo:`, error);
      next(error);
    }
  };

  /**
   * POST /store/cart/add-item
   * Agregar item al carrito
   */
  addItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cart_id, variant_id, quantity } = req.body;


      if (!cart_id) {
        throw new BadRequestError('cart_id es requerido');
      }

      if (!variant_id) {
        throw new BadRequestError('variant_id es requerido');
      }

      if (!quantity || quantity < 1) {
        throw new BadRequestError('quantity debe ser mayor a 0');
      }

      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id; // Obtener userId del usuario autenticado
      
      console.log(`🔍 [CART] Agregando item: cart_id=${cart_id}, variant_id=${variant_id}, quantity=${quantity}, userId=${userId || 'null'}`);
      
      const cart = await this.cartService.addItemToCart(cart_id, variant_id, quantity, userId);
      
      // Si el carrito no tenía userId y ahora tenemos uno, actualizarlo
      if (userId && cart && !cart.userId) {
        console.log(`🛒 [CART] Actualizando cart ${cart.id} con userId: ${userId}`);
        await prisma.cart.update({
          where: { id: cart.id },
          data: { userId },
        });
        // Re-obtener el carrito actualizado
        const updatedCart = await this.cartService.getCartById(cart.id);
        if (updatedCart) {
          Object.assign(cart, updatedCart);
        }
      }

      console.log(`✅ [CART] Item agregado. Carrito tiene ${cart.items.length} items`);

      // Formatear respuesta
      const formattedCart = {
        ...cart,
        subtotal: cart.subtotal || 0,
        total: cart.total || cart.subtotal || 0,
        region_id: null,
        region: null,
        shipping_methods: [],
        promotions: [],
      };

      const response = {
        success: true,
        message: 'Item agregado al carrito',
        data: formattedCart,
        cart: formattedCart,
        cart_id: cart.id,
      };

      console.log(`✅ [CART] Item agregado exitosamente. Respuesta:`, JSON.stringify(response, null, 2));

      res.status(200).json(response);
    } catch (error) {
      console.error(`❌ [CART] Error agregando item:`, error);
      next(error);
    }
  };

  /**
   * POST /store/cart/update-item
   * Actualizar cantidad de item en el carrito
   */
  updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cart_id, line_id, quantity } = req.body;
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id; // Obtener userId si está autenticado

      if (!cart_id) {
        throw new BadRequestError('cart_id es requerido');
      }

      if (!line_id) {
        throw new BadRequestError('line_id es requerido');
      }

      if (quantity === undefined || quantity === null) {
        throw new BadRequestError('quantity es requerido');
      }

      console.log(`🛒 [CART] Actualizando item: cartId=${cart_id}, lineId=${line_id}, quantity=${quantity}, userId=${userId || 'null'}`);

      const cart = await this.cartService.updateCartItem(cart_id, line_id, quantity, userId);

      // Formatear respuesta
      const formattedCart = {
        ...cart,
        subtotal: cart.subtotal || 0,
        total: cart.total || cart.subtotal || 0,
        region_id: null,
        region: null,
        shipping_methods: [],
        promotions: [],
      };

      res.status(200).json({
        success: true,
        message: 'Item actualizado',
        data: formattedCart,
        cart: formattedCart,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /store/cart/delete-item
   * Eliminar item del carrito
   */
  deleteItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cart_id, line_id } = req.body;

      if (!cart_id) {
        throw new BadRequestError('cart_id es requerido');
      }

      if (!line_id) {
        throw new BadRequestError('line_id es requerido');
      }

      const cart = await this.cartService.deleteCartItem(cart_id, line_id);

      // Formatear respuesta
      const formattedCart = {
        ...cart,
        subtotal: cart.subtotal || 0,
        total: cart.total || cart.subtotal || 0,
        region_id: null,
        region: null,
        shipping_methods: [],
        promotions: [],
      };

      res.status(200).json({
        success: true,
        message: 'Item eliminado',
        data: formattedCart,
        cart: formattedCart,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== NUEVOS MÉTODOS NORMALIZADOS ====================

  /**
   * GET /api/v1/cart
   * Obtener o crear carrito (funciona sin autenticación - carrito guest)
   * 
   * Si hay usuario autenticado: retorna su carrito o crea uno nuevo
   * Si no hay usuario (guest): crea un carrito guest (userId = null)
   */
  getCurrentUserCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;

      // Si hay usuario autenticado, obtener su carrito
      if (userId) {
        try {
          let cart = await this.cartService.getUserCart(userId);

          // Si no existe carrito, crear uno nuevo
          if (!cart) {
            console.log(`📦 [CART] No hay carrito para usuario ${userId}, creando nuevo...`);
            cart = await this.cartService.createCartNormalized(userId);
          }

          return res.status(200).json(successResponse(cart));
        } catch (error: any) {
          // Si hay error de foreign key, el usuario no existe
          if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint') || error?.message?.includes('Usuario no encontrado')) {
            console.error(`❌ [CART] Usuario ${userId} no existe en la base de datos. Token válido pero usuario eliminado.`);
            console.error(`   Error:`, error?.message);
            return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'Usuario no encontrado. Por favor, inicia sesión nuevamente.'));
          }
          throw error;
        }
      }

      // Si no hay usuario (guest), crear un carrito guest (userId = null)
      // El carrito guest se guardará en localStorage del frontend
      // Cuando el usuario se registre, se puede asociar este carrito al usuario
      try {
        const guestCart = await this.cartService.createCartNormalized(undefined);
        
        console.log(`📦 [CART] Carrito guest creado: ${guestCart.id}`);
        
        res.status(200).json(successResponse(guestCart));
      } catch (error: any) {
        console.error(`❌ [CART] Error creando carrito guest:`, error);
        console.error(`   Error details:`, {
          message: error?.message,
          code: error?.code,
          stack: error?.stack,
        });
        // Retornar error más descriptivo
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_ERROR, 'Error al crear carrito. Por favor, intenta nuevamente.'));
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/cart
   * Crear carrito nuevo (NUEVO - Normalizado)
   */
  createCartNormalized = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;

      const cart = await this.cartService.createCartNormalized(userId);

      res.status(201).json(successResponse(cart));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/cart/items
   * Agregar item al carrito (NUEVO - Normalizado)
   */
  addItemNormalized = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;

      const { variantId, quantity, cartId } = req.body;

      if (!variantId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'variantId es requerido'));
      }

      if (!quantity || quantity <= 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'quantity debe ser mayor a 0'));
      }

      // Si no hay cartId, obtener o crear carrito
      let finalCartId = cartId;
      if (!finalCartId) {
        if (userId) {
          // Usuario autenticado: obtener o crear su carrito
          let userCart = await this.cartService.getUserCart(userId);
          if (!userCart) {
            userCart = await this.cartService.createCartNormalized(userId);
          }
          finalCartId = userCart.id;
        } else {
          // Usuario guest: crear un carrito guest
          const guestCart = await this.cartService.createCartNormalized(undefined);
          finalCartId = guestCart.id;
          console.log(`📦 [CART] Carrito guest creado para agregar item: ${finalCartId}`);
        }
      }

      if (!finalCartId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'No se pudo crear o obtener el carrito'));
      }

      const cart = await this.cartService.addItemToCartNormalized(finalCartId, variantId, quantity, userId);

      res.status(200).json(successResponse(cart));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/cart/items/:itemId
   * Actualizar cantidad de item (NUEVO - Normalizado)
   */
  updateItemNormalized = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;

      const { itemId } = req.params;
      const { quantity, cartId } = req.body;

      if (!itemId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'itemId es requerido'));
      }

      if (quantity === undefined || quantity < 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'quantity debe ser mayor o igual a 0'));
      }

      // Siempre buscar el item primero para obtener su cartId
      // Esto asegura que funcionará para ambos tipos de carritos (normal y de regalos)
      const item = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true },
      });

      if (!item) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, 'Item del carrito no encontrado'));
      }

      // Verificar que el carrito pertenece al usuario si está autenticado
      if (userId && item.cart.userId !== userId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, 'No tienes permiso para actualizar este item'));
      }

      // Si se pasó cartId en el body, verificar que coincida con el del item
      if (cartId && cartId !== item.cart.id) {
        console.warn(`[CART] cartId del body (${cartId}) no coincide con el del item (${item.cart.id}), usando el del item`);
      }

      const finalCartId = item.cart.id;

      const cart = await this.cartService.updateCartItemNormalized(finalCartId, itemId, quantity, userId);

      res.status(200).json(successResponse(cart));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/cart/items/:itemId
   * Eliminar item del carrito (NUEVO - Normalizado)
   */
  deleteItemNormalized = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;

      const { itemId } = req.params;
      // Intentar obtener cartId del body (puede no estar disponible en DELETE)
      let cartId: string | undefined;
      try {
        cartId = req.body?.cartId;
      } catch (e) {
        // Si el body no se puede parsear, continuar sin cartId
        console.log('[CART] No se pudo parsear body en DELETE, buscando item directamente');
      }

      if (!itemId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'itemId es requerido'));
      }

      // Siempre buscar el item primero para obtener su cartId
      // Esto asegura que funcionará incluso si el body no se parsea correctamente
      const item = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true },
      });

      if (!item) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, 'Item del carrito no encontrado'));
      }

      // Verificar que el carrito pertenece al usuario si está autenticado
      if (userId && item.cart.userId !== userId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, 'No tienes permiso para eliminar este item'));
      }

      // Si se pasó cartId en el body, verificar que coincida con el del item
      if (cartId && cartId !== item.cart.id) {
        console.warn(`[CART] cartId del body (${cartId}) no coincide con el del item (${item.cart.id}), usando el del item`);
      }

      const finalCartId = item.cart.id;

      const cart = await this.cartService.deleteCartItemNormalized(finalCartId, itemId);

      res.status(200).json(successResponse(cart));
    } catch (error) {
      next(error);
    }
  };
}

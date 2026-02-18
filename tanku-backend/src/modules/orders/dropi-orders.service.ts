import { prisma } from '../../config/database';
import { env } from '../../config/env';

const DROPI_BASE_URL = env.DROPI_BASE_URL || 'https://test-api.dropi.co';

/**
 * Mapear ciudad a formato Dropi (nombre en mayúsculas)
 */
function mapCityToDropiFormat(city: string): string {
  const cityMap: Record<string, string> = {
    'BOGOTA D.C.': 'BOGOTA',
    'BOGOTÁ D.C.': 'BOGOTA',
    'BOGOTÁ': 'BOGOTA',
    'BOGOTA': 'BOGOTA',
  };

  const normalized = city.toUpperCase().trim();
  return cityMap[normalized] || normalized;
}

/**
 * Mapear departamento a formato Dropi
 * IMPORTANTE: Bogotá siempre debe mapearse a CUNDINAMARCA
 */
function mapProvinceToDropiFormat(province: string): string {
  const provinceMap: Record<string, string> = {
    'BOGOTA D.C.': 'CUNDINAMARCA',
    'BOGOTÁ D.C.': 'CUNDINAMARCA',
    'BOGOTA': 'CUNDINAMARCA',
    'BOGOTÁ': 'CUNDINAMARCA',
    'DISTRITO CAPITAL': 'CUNDINAMARCA',
    'D.C.': 'CUNDINAMARCA',
  };

  const normalized = province.toUpperCase().trim();
  
  // Si contiene "BOGOTA" o "BOGOTÁ" en cualquier parte, mapear a CUNDINAMARCA
  if (normalized.includes('BOGOTA') || normalized.includes('BOGOTÁ')) {
    return 'CUNDINAMARCA';
  }
  
  return provinceMap[normalized] || normalized;
}

/**
 * Obtener dropi_id desde el SKU de la variante
 * Soporta dos formatos:
 * 1. DP-{dropi_id}-{sku_original} (formato nuevo)
 * 2. {sku_original}-DP-{dropi_id} (formato actual en BD)
 */
function extractDropiIdFromSku(sku: string): number | null {
  if (!sku || typeof sku !== 'string') {
    return null;
  }

  // Formato 1: DP-{dropi_id}-{sku_original}
  let match = sku.match(/^DP-(\d+)-/);
  if (match) {
    return parseInt(match[1]);
  }

  // Formato 2: {sku_original}-DP-{dropi_id}
  match = sku.match(/-DP-(\d+)$/);
  if (match) {
    return parseInt(match[1]);
  }

  return null;
}

/**
 * Obtener información del producto Dropi desde datos locales
 */
async function getDropiProductInfoFromLocal(
  dropiId: number
): Promise<{ type: string; variationsData?: any[] } | null> {
  try {
    const dropiProduct = await prisma.dropiProduct.findUnique({
      where: { dropiId },
      select: {
        type: true,
        variationsData: true,
      },
    });

    if (dropiProduct) {
      return {
        type: dropiProduct.type,
        variationsData: dropiProduct.variationsData as any[],
      };
    }

    return null;
  } catch (error: any) {
    console.error(
      `❌ [DROPI-ORDER] Error obteniendo producto ${dropiId}:`,
      error?.message
    );
    return null;
  }
}

export class DropiOrdersService {
  constructor() {
    // dropiService no se usa actualmente, pero se mantiene para futuras implementaciones
  }

  /**
   * Crear orden en Dropi desde una orden local
   * 
   * @param orderId ID de la orden local
   * @returns Array de IDs de órdenes creadas en Dropi
   */
  async createOrderInDropi(orderId: string): Promise<{
    success: boolean;
    dropiOrderIds: number[];
    errors: Array<{ item: string; error: string }>;
  }> {
    console.log(`\n📦 [DROPI-ORDER] ========== INICIANDO CREACIÓN EN DROPI ==========`);
    console.log(`📦 [DROPI-ORDER] Order ID: ${orderId}`);

    // Obtener orden local
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
            variant: true,
            product: true,
          },
        },
      },
    });

    if (!order) {
      console.error(`❌ [DROPI-ORDER] Orden ${orderId} no encontrada en BD`);
      throw new Error(`Orden ${orderId} no encontrada`);
    }

    console.log(`📦 [DROPI-ORDER] Orden encontrada:`);
    console.log(`📦 [DROPI-ORDER] - Payment Method: ${order.paymentMethod}`);
    console.log(`📦 [DROPI-ORDER] - Payment Status: ${order.paymentStatus}`);
    console.log(`📦 [DROPI-ORDER] - Total Items: ${order.items.length}`);
    console.log(`📦 [DROPI-ORDER] - Total: ${order.total}`);
    console.log(`📦 [DROPI-ORDER] - Subtotal: ${order.subtotal}`);
    console.log(`📦 [DROPI-ORDER] - Shipping Total: ${order.shippingTotal}`);

    const orderAddress = order.orderAddresses && order.orderAddresses.length > 0 ? order.orderAddresses[0].address : null;
    if (!orderAddress) {
      console.error(`❌ [DROPI-ORDER] Orden ${orderId} no tiene dirección de envío`);
      throw new Error(`Orden ${orderId} no tiene dirección de envío`);
    }

    console.log(`📦 [DROPI-ORDER] Dirección de envío encontrada:`);
    console.log(`📦 [DROPI-ORDER] - Nombre: ${orderAddress.firstName} ${orderAddress.lastName}`);
    console.log(`📦 [DROPI-ORDER] - Ciudad: ${orderAddress.city}`);
    console.log(`📦 [DROPI-ORDER] - Estado: ${orderAddress.state}`);
    console.log(`📦 [DROPI-ORDER] - Dirección: ${orderAddress.address1}`);

    // Obtener token de Dropi
    const token = env.DROPI_STATIC_TOKEN;
    if (!token) {
      console.error(`❌ [DROPI-ORDER] Token de Dropi no configurado`);
      throw new Error('Token de Dropi no configurado');
    }

    console.log(`📦 [DROPI-ORDER] Token de Dropi encontrado (${token.substring(0, 10)}...)`);

    // Mapear items a productos Dropi
    const dropiProducts: Array<{
      id: number;
      price: number;
      quantity: number;
      variation_id?: number | null;
    }> = [];

    console.log(`📦 [DROPI-ORDER] Mapeando ${order.items.length} items a productos Dropi...`);

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      console.log(`📦 [DROPI-ORDER] Procesando item ${i + 1}/${order.items.length}:`);
      console.log(`📦 [DROPI-ORDER] - SKU: ${item.variant.sku}`);
      console.log(`📦 [DROPI-ORDER] - Quantity: ${item.quantity}`);
      console.log(`📦 [DROPI-ORDER] - Price: ${item.price}`);
      console.log(`📦 [DROPI-ORDER] - Final Price: ${item.finalPrice || 'N/A'}`);

      // Extraer dropi_id del SKU
      const dropiId = extractDropiIdFromSku(item.variant.sku);
      console.log(`📦 [DROPI-ORDER] - Dropi ID extraído: ${dropiId || 'NO ENCONTRADO'}`);

      if (!dropiId) {
        console.warn(`⚠️ [DROPI-ORDER] No se pudo extraer Dropi ID del SKU: ${item.variant.sku}`);
        continue;
      }

      // Obtener información del producto
      const dropiProductInfo = await getDropiProductInfoFromLocal(dropiId);
      if (!dropiProductInfo) {
        console.warn(`⚠️ [DROPI-ORDER] No se encontró información del producto Dropi ID: ${dropiId}`);
        continue;
      }

      console.log(`📦 [DROPI-ORDER] - Producto Dropi encontrado: Tipo=${dropiProductInfo.type}`);

      // Determinar variation_id si es VARIABLE
      let variationId: number | null = null;
      if (dropiProductInfo.type === 'VARIABLE') {
        // Intentar extraer del SKU en ambos formatos:
        // Formato 1: DP-{dropi_id}-{variation_sku}
        // Formato 2: {variation_sku}-DP-{dropi_id}
        let variationSku: string | null = null;
        
        let skuMatch = item.variant.sku.match(/^DP-\d+-(.+)$/);
        if (skuMatch) {
          variationSku = skuMatch[1];
        } else {
          skuMatch = item.variant.sku.match(/^(.+)-DP-\d+$/);
          if (skuMatch) {
            variationSku = skuMatch[1];
          }
        }

        if (variationSku && dropiProductInfo.variationsData) {
          const variation = dropiProductInfo.variationsData.find(
            (v: any) => v.sku === variationSku
          );
          if (variation) {
            variationId = variation.id;
          }
        }

        if (!variationId) {
          continue;
        }
      }

      // item.price es el precio BASE (sin incremento)
      // item.finalPrice es el precio final (tankuPrice)
      // Usar finalPrice si está disponible, sino usar price (que ya es tankuPrice)
      const finalPrice = item.finalPrice || item.price;
      
      const dropiProduct = {
        id: dropiId,
        price: finalPrice, // Precio con incremento (15% + $10,000)
        quantity: item.quantity,
        variation_id: variationId,
        orderItemId: item.id, // Guardar referencia al OrderItem
      };

      console.log(`📦 [DROPI-ORDER] - Producto mapeado exitosamente:`, {
        id: dropiProduct.id,
        price: dropiProduct.price,
        quantity: dropiProduct.quantity,
        variation_id: dropiProduct.variation_id,
      });

      dropiProducts.push(dropiProduct);
    }

    console.log(`📦 [DROPI-ORDER] Total de productos mapeados: ${dropiProducts.length}/${order.items.length}`);

    if (dropiProducts.length === 0) {
      console.error(`❌ [DROPI-ORDER] No se pudieron mapear productos a Dropi`);
      console.error(`❌ [DROPI-ORDER] Items en orden: ${order.items.length}`);
      console.error(`❌ [DROPI-ORDER] SKUs de items:`, order.items.map(item => item.variant.sku));
      throw new Error('No se pudieron mapear productos a Dropi');
    }

    // Determinar rate_type según método de pago
    // Según manual de Dropi: "CON RECAUDO" (contra entrega) o "SIN RECAUDO" (prepago)
    const rateType =
      order.paymentMethod === 'cash_on_delivery' ? 'CON RECAUDO' : 'SIN RECAUDO';
    
    console.log(`📦 [DROPI-ORDER] Método de pago: ${order.paymentMethod}`);
    console.log(`📦 [DROPI-ORDER] Rate Type para Dropi: ${rateType}`);
    console.log(`📦 [DROPI-ORDER] Total de productos a procesar: ${dropiProducts.length}`);

    // Calcular shipping proporcional por producto
    const shippingTotal = order.shippingTotal || 0;
    const shippingPerProduct = Math.round(shippingTotal / dropiProducts.length);

    const dropiOrderIds: number[] = [];
    const errors: Array<{ item: string; error: string }> = [];
    let totalDiscountedAmount = 0; // Acumular discounted_amount de todas las órdenes de Dropi
    const dropiResponses: Array<{
      dropiOrderId: number;
      response: any;
      shippingTotal: number;
    }> = []; // Guardar respuestas completas de Dropi

    // Crear una orden en Dropi por cada producto (según el backend viejo)
    for (let i = 0; i < dropiProducts.length; i++) {
      const product = dropiProducts[i];
      // El precio ya incluye el incremento de $25,000
      const productTotal = Math.round(product.price * product.quantity);

      if (isNaN(productTotal) || productTotal <= 0) {
        errors.push({
          item: `Producto ${i + 1}`,
          error: `ProductTotal inválido: ${productTotal}`,
        });
        continue;
      }

      const totalOrderWithShipping = productTotal + shippingPerProduct;
      
      // El productTotal ya incluye el incremento (15% + $10,000)
      // total_order debe ser el total del producto (con incremento) + shipping
      const finalTotalOrder = shippingTotal > 0 ? totalOrderWithShipping : productTotal;

      // Construir body para crear orden en Dropi
      const dropiOrderBody = {
        calculate_costs_and_shiping: true,
        state: mapProvinceToDropiFormat(orderAddress.state || ''),
        city: mapCityToDropiFormat(orderAddress.city || ''),
        name: orderAddress.firstName || '',
        surname: orderAddress.lastName || '',
        dir: `${orderAddress.address1}${orderAddress.detail ? `, ${orderAddress.detail}` : ''}`.trim(),
        phone: orderAddress.phone || '',
        client_email: order.email || '',
        notes: `Orden Tanku: ${orderId} - Producto ${i + 1}/${dropiProducts.length}`,
        payment_method_id: 1, // Siempre 1 según manual
        dni: '',
        dni_type: '',
        rate_type: rateType,
        type: 'FINAL_ORDER',
        total_order: finalTotalOrder, // Incluye producto + shipping (producto ya tiene incremento 15% + $10,000)
        text_to_show_order_rotulo: `Orden #${orderId} - ${product.id}`,
        // shop_order_id: `${orderId}-${i + 1}`, Esto se elimina
        products: [{
          ...product,
          price: product.price, // Ya incluye incremento (15% + $10,000)
        }],
      };

      try {
        console.log(`📦 [DROPI-ORDER] Creando orden ${i + 1}/${dropiProducts.length} en Dropi...`);
        console.log(`📦 [DROPI-ORDER] Producto ID: ${product.id}`);
        console.log(`📦 [DROPI-ORDER] Rate Type: ${rateType}`);
        console.log(`📦 [DROPI-ORDER] Total Order: ${finalTotalOrder}`);
        console.log(`📦 [DROPI-ORDER] Body enviado a Dropi:`, JSON.stringify(dropiOrderBody, null, 2));

        const response = await fetch(`${DROPI_BASE_URL}/integrations/orders/myorders`, {
          method: 'POST',
          headers: {
            'dropi-integration-key': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dropiOrderBody),
          signal: AbortSignal.timeout(30000), // 30 segundos timeout
        });

        console.log(`📦 [DROPI-ORDER] Respuesta HTTP Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [DROPI-ORDER] Error HTTP ${response.status}:`, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const dropiResponse = await response.json() as any;
        console.log(`📦 [DROPI-ORDER] Respuesta completa de Dropi:`, JSON.stringify(dropiResponse, null, 2));

        if (!dropiResponse.isSuccess || !dropiResponse.objects) {
          console.error(`❌ [DROPI-ORDER] Error en respuesta de Dropi:`, dropiResponse.message);
          console.error(`❌ [DROPI-ORDER] isSuccess: ${dropiResponse.isSuccess}`);
          console.error(`❌ [DROPI-ORDER] objects:`, dropiResponse.objects);
          throw new Error(dropiResponse.message || 'Dropi retornó isSuccess=false');
        }

        const dropiOrderId = dropiResponse.objects.id || dropiResponse.objects.order_id;
        // Extraer ambos valores: discounted_amount (envío) y dropshipper_amount_to_win (ganancia)
        const discountedAmount = dropiResponse.objects.discounted_amount || 0;
        const dropshipperAmountToWin = dropiResponse.objects.dropshipper_amount_to_win || 0;
        
        if (dropiOrderId) {
          dropiOrderIds.push(dropiOrderId);
          // Acumular el discounted_amount (costo de envío)
          totalDiscountedAmount += Math.round(discountedAmount);
          
          console.log(`✅ [DROPI-ORDER] Orden Dropi ${dropiOrderId} creada exitosamente`);
          console.log(`✅ [DROPI-ORDER] - Discounted Amount (envío): ${discountedAmount}`);
          console.log(`✅ [DROPI-ORDER] - Dropshipper Win (ganancia): ${dropshipperAmountToWin}`);
          
          // Guardar información en OrderItem: ambos valores
          const orderItemId = (product as any).orderItemId;
          if (orderItemId) {
            await prisma.orderItem.update({
              where: { id: orderItemId },
              data: {
                dropiOrderId: dropiOrderId,
                dropiShippingCost: Math.round(discountedAmount), // discounted_amount (envío)
                dropiDropshipperWin: Math.round(dropshipperAmountToWin), // dropshipper_amount_to_win (ganancia)
                dropiStatus: 'PENDING',
                finalPrice: product.price,
              },
            });
            console.log(`✅ [DROPI-ORDER] OrderItem ${orderItemId} actualizado con Dropi Order ID`);
          } else {
            console.warn(`⚠️ [DROPI-ORDER] No se encontró orderItemId para actualizar`);
          }
          
          // Guardar respuesta completa en el array
          dropiResponses.push({
            dropiOrderId,
            response: dropiResponse,
            shippingTotal: Math.round(discountedAmount),
          });
          
          console.log(`✅ [DROPI-ORDER] Orden ${dropiOrderId} procesada y guardada correctamente`);
        } else {
          throw new Error('Dropi no retornó order_id');
        }
      } catch (error: any) {
        console.error(`❌ [DROPI-ORDER] Error creando orden ${i + 1}/${dropiProducts.length} en Dropi:`, error?.message);
        console.error(`❌ [DROPI-ORDER] Stack trace:`, error?.stack);
        errors.push({
          item: `Producto ${i + 1} (Dropi ID: ${product.id})`,
          error: error?.message || 'Error desconocido',
        });
      }
    }

    console.log(`📦 [DROPI-ORDER] ========== RESUMEN DE CREACIÓN EN DROPI ==========`);
    console.log(`📦 [DROPI-ORDER] Total de productos procesados: ${dropiProducts.length}`);
    console.log(`📦 [DROPI-ORDER] Órdenes creadas exitosamente: ${dropiOrderIds.length}`);
    console.log(`📦 [DROPI-ORDER] Dropi Order IDs: ${dropiOrderIds.join(', ')}`);
    console.log(`📦 [DROPI-ORDER] Errores: ${errors.length}`);
    if (errors.length > 0) {
      console.error(`❌ [DROPI-ORDER] Errores detallados:`, errors);
    }
    console.log(`📦 [DROPI-ORDER] =================================================\n`);

    // Actualizar orden local con shipping_total y total calculados desde Dropi
    if (dropiOrderIds.length > 0) {
      
      // Recalcular subtotal desde OrderItems (con finalPrice)
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
      });
      
      const recalculatedSubtotal = orderItems.reduce((sum, item) => {
        return sum + (item.finalPrice * item.quantity);
      }, 0);
      
      // Calcular total final: subtotal + discounted_amount acumulado (envío)
      const recalculatedTotal = recalculatedSubtotal + Math.round(totalDiscountedAmount);
      
      // Obtener metadata actual de la orden
      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { metadata: true },
      });
      const currentMetadata = (currentOrder?.metadata as Record<string, any>) || {};
      
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          // Actualizar subtotal con finalPrice de cada item
          subtotal: recalculatedSubtotal,
          // Actualizar shippingTotal con la suma de todos los discounted_amount (envío)
          shippingTotal: Math.round(totalDiscountedAmount),
          // Actualizar total: subtotal + shippingTotal
          total: recalculatedTotal,
          // Guardar respuestas completas de Dropi en metadata
          metadata: {
            ...currentMetadata,
            dropi_order_ids: dropiOrderIds,
            dropi_responses: dropiResponses,
            dropi_discounted_amount_total: totalDiscountedAmount,
          },
        },
      });
    }

    return {
      success: dropiOrderIds.length > 0,
      dropiOrderIds,
      errors,
    };
  }

  /**
   * Obtener información de una orden específica en Dropi por ID
   * Según manual: GET /orders/myorders/#IdOrden#
   * 
   * @param dropiOrderId ID de la orden en Dropi
   * @returns Información de la orden en Dropi
   */
  async getDropiOrderStatus(dropiOrderId: number): Promise<any> {
    console.log(`\n📦 [DROPI-ORDER-STATUS] ========== CONSULTANDO ESTADO DE ORDEN EN DROPI ==========`);
    console.log(`📦 [DROPI-ORDER-STATUS] Dropi Order ID: ${dropiOrderId}`);

    try {
      // Obtener token de Dropi desde env
      const token = env.DROPI_STATIC_TOKEN;
      if (!token) {
        throw new Error('Token de Dropi no configurado (DROPI_STATIC_TOKEN)');
      }

      console.log(`🔑 [DROPI-ORDER-STATUS] Token de Dropi configurado (longitud: ${token.length})`);
      console.log(`🌐 [DROPI-ORDER-STATUS] URL base de Dropi: ${DROPI_BASE_URL}`);

      // Según manual: GET /orders/myorders/#IdOrden#
      const url = `${DROPI_BASE_URL}/integrations/orders/myorders/${dropiOrderId}`;
      
      console.log(`📤 [DROPI-ORDER-STATUS] URL completa: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'dropi-integration-key': token,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30 segundos timeout
      });

      console.log(`📥 [DROPI-ORDER-STATUS] Respuesta HTTP: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [DROPI-ORDER-STATUS] Error HTTP: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const dropiResponse = await response.json() as {
        isSuccess: boolean;
        message?: string;
        objects?: any;
      };
      console.log(`📥 [DROPI-ORDER-STATUS] Respuesta JSON de Dropi:`, JSON.stringify(dropiResponse, null, 2));

      if (!dropiResponse.isSuccess) {
        const errorMsg = dropiResponse.message || 'Dropi retornó isSuccess=false';
        console.error(`❌ [DROPI-ORDER-STATUS] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      if (!dropiResponse.objects) {
        console.error(`❌ [DROPI-ORDER-STATUS] Dropi no retornó objects en la respuesta`);
        throw new Error('Dropi no retornó objects');
      }

      const orderData = dropiResponse.objects;
      
      // Extraer información relevante de la orden
      const orderStatus = {
        id: orderData.id,
        status: orderData.status || 'N/A',
        shipping_company: orderData.shipping_company || null,
        shipping_guide: orderData.shipping_guide || null,
        sticker: orderData.sticker || null,
        created_at: orderData.created_at || null,
        updated_at: orderData.updated_at || null,
        total_order: orderData.total_order || 0,
        shipping_cost: orderData.shipping_cost || 0,
        // Información adicional
        client_name: orderData.name || null,
        client_surname: orderData.surname || null,
        city: orderData.city || null,
        state: orderData.state || null,
        // Detalles completos
        full_data: orderData,
      };

      console.log(`✅ [DROPI-ORDER-STATUS] Estado de orden obtenido:`, {
        id: orderStatus.id,
        status: orderStatus.status,
        shipping_guide: orderStatus.shipping_guide,
        shipping_company: orderStatus.shipping_company,
      });
      console.log(`📦 [DROPI-ORDER-STATUS] ========== FIN CONSULTA DE ESTADO ==========\n`);

      return orderStatus;
    } catch (error: any) {
      console.error(`❌ [DROPI-ORDER-STATUS] Error consultando estado de orden:`, error?.message);
      console.log(`📦 [DROPI-ORDER-STATUS] ========== FIN CONSULTA DE ESTADO (ERROR) ==========\n`);
      throw error;
    }
  }

  /**
   * Crear orden en Dropi desde un StalkerGift aceptado
   * 
   * @param stalkerGiftId ID del StalkerGift
   * @param addressId ID de la dirección del receptor
   * @returns Orden creada en Dropi y Order local
   */
  async createOrderFromStalkerGift(
    stalkerGiftId: string,
    addressId: string
  ): Promise<{
    order: any;
    dropiOrderIds: number[];
  }> {
    console.log(`\n🎁 [DROPI-STALKERGIFT] ========== CREANDO ORDEN DESDE STALKERGIFT ==========`);
    console.log(`🎁 [DROPI-STALKERGIFT] StalkerGift ID: ${stalkerGiftId}`);
    console.log(`🎁 [DROPI-STALKERGIFT] Address ID: ${addressId}`);

    // Obtener StalkerGift con relaciones
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
      include: {
        product: true,
        variant: true,
        sender: true,
        receiver: true,
      },
    });

    if (!stalkerGift) {
      throw new Error(`StalkerGift ${stalkerGiftId} no encontrado`);
    }

    if (stalkerGift.estado !== 'ACCEPTED') {
      throw new Error(`StalkerGift debe estar en estado ACCEPTED, actual: ${stalkerGift.estado}`);
    }

    // Obtener dirección del receptor
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new Error(`Dirección ${addressId} no encontrada`);
    }

    // Validar que la dirección pertenece al receptor
    if (stalkerGift.receiverId && address.userId !== stalkerGift.receiverId) {
      throw new Error('La dirección no pertenece al receptor del regalo');
    }

    // Obtener email del receptor (si ya tiene cuenta, debe tener email porque está logueado)
    // Si no tiene cuenta aún, usar el email del sender como fallback
    if (!stalkerGift.sender) {
      throw new Error('El sender del regalo no está disponible');
    }
    const receiverEmail = stalkerGift.receiver?.email || stalkerGift.sender.email;

    // Calcular precios
    let unitPrice = 0;
    if (stalkerGift.variant) {
      unitPrice = stalkerGift.variant.suggestedPrice || stalkerGift.variant.price;
    } else {
      // Si no hay variante, usar precio mínimo
      const variants = await prisma.productVariant.findMany({
        where: { productId: stalkerGift.productId, active: true },
      });
      if (variants.length > 0) {
        const minVariant = variants.reduce((min, v) => {
          const price = v.suggestedPrice || v.price;
          const minPrice = min.suggestedPrice || min.price;
          return price < minPrice ? v : min;
        });
        unitPrice = minVariant.suggestedPrice || minVariant.price;
      }
    }

    // Calcular subtotal con incremento (15% + $10,000)
    const baseSubtotal = unitPrice * stalkerGift.quantity;
    const increment = Math.round(baseSubtotal * 0.15) + 10000;
    const subtotal = baseSubtotal + increment;
    const shippingTotal = 0; // Se calculará con Dropi
    const total = subtotal + shippingTotal;

    // Crear Order local usando OrdersService
    const { OrdersService } = await import('./orders.service');
    const ordersService = new OrdersService();

    const orderUserId = stalkerGift.receiverId || stalkerGift.senderId;
    if (!orderUserId) {
      throw new Error('No se puede crear la orden: falta userId (receiverId o senderId)');
    }

    const orderInput = {
      userId: orderUserId,
      email: receiverEmail,
      paymentMethod: 'epayco', // StalkerGift siempre usa ePayco
      total,
      subtotal,
      shippingTotal,
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone || '',
        address1: address.address1,
        detail: address.detail || undefined,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      items: [{
        productId: stalkerGift.productId,
        variantId: stalkerGift.variantId || '',
        quantity: stalkerGift.quantity,
        price: unitPrice,
      }],
      isStalkerGift: true,
      metadata: {
        stalkerGiftId: stalkerGift.id,
        senderAlias: stalkerGift.senderAlias,
      },
    };

    const order = await ordersService.createOrder(orderInput);

    console.log(`✅ [DROPI-STALKERGIFT] Order local creada: ${order.id}`);

    // Crear orden en Dropi
    const dropiResult = await this.createOrderInDropi(order.id);

    console.log(`✅ [DROPI-STALKERGIFT] Orden Dropi creada: ${dropiResult.dropiOrderIds.join(', ')}`);

    // Vincular Order con StalkerGift
    await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        orderId: order.id,
      },
    });

    console.log(`✅ [DROPI-STALKERGIFT] StalkerGift vinculado con Order: ${order.id}`);
    console.log(`🎁 [DROPI-STALKERGIFT] ========== FIN CREACIÓN DE ORDEN ==========\n`);

    return {
      order,
      dropiOrderIds: dropiResult.dropiOrderIds,
    };
  }
}

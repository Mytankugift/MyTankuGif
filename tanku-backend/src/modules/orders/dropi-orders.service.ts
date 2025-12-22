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
    console.log(`\n📦 [DROPI-ORDER] ========== INICIANDO CREACIÓN DE ORDEN EN DROPI ==========`);
    console.log(`📦 [DROPI-ORDER] Orden local ID: ${orderId}`);

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

    console.log(`✅ [DROPI-ORDER] Orden encontrada:`, {
      id: order.id,
      email: order.email,
      paymentMethod: order.paymentMethod,
      total: order.total,
      subtotal: order.subtotal,
      shippingTotal: order.shippingTotal,
      itemsCount: order.items.length,
      hasAddress: !!(order.orderAddresses && order.orderAddresses.length > 0 && order.orderAddresses[0].address),
    });

    const orderAddress = order.orderAddresses && order.orderAddresses.length > 0 ? order.orderAddresses[0].address : null;
    if (!orderAddress) {
      console.error(`❌ [DROPI-ORDER] Orden ${orderId} no tiene dirección de envío`);
      throw new Error(`Orden ${orderId} no tiene dirección de envío`);
    }

    console.log(`📍 [DROPI-ORDER] Dirección de envío:`, {
      firstName: orderAddress.firstName,
      lastName: orderAddress.lastName,
      city: orderAddress.city,
      state: orderAddress.state,
      address1: orderAddress.address1,
      phone: orderAddress.phone,
    });

    // Obtener token de Dropi
    const token = env.DROPI_STATIC_TOKEN;
    if (!token) {
      console.error(`❌ [DROPI-ORDER] Token de Dropi no configurado en variables de entorno`);
      throw new Error('Token de Dropi no configurado');
    }

    console.log(`🔑 [DROPI-ORDER] Token de Dropi configurado (longitud: ${token.length})`);
    console.log(`🌐 [DROPI-ORDER] URL base de Dropi: ${DROPI_BASE_URL}`);

    // Mapear items a productos Dropi
    const dropiProducts: Array<{
      id: number;
      price: number;
      quantity: number;
      variation_id?: number | null;
    }> = [];

    console.log(`\n🛍️ [DROPI-ORDER] Mapeando ${order.items.length} items a productos Dropi...`);

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      console.log(`\n📦 [DROPI-ORDER] Procesando item ${i + 1}/${order.items.length}:`, {
        itemId: item.id,
        variantId: item.variantId,
        sku: item.variant.sku,
        price: item.price,
        quantity: item.quantity,
        productTitle: item.product.title,
        variantTitle: item.variant.title,
      });

      // Extraer dropi_id del SKU
      const dropiId = extractDropiIdFromSku(item.variant.sku);

      if (!dropiId) {
        console.warn(
          `⚠️ [DROPI-ORDER] Item ${item.id} no tiene dropi_id válido en SKU: ${item.variant.sku}`
        );
        console.warn(`⚠️ [DROPI-ORDER] SKU no sigue el formato esperado: DP-{dropi_id}-{sku_original}`);
        continue;
      }

      console.log(`✅ [DROPI-ORDER] Dropi ID extraído: ${dropiId}`);

      // Obtener información del producto
      const dropiProductInfo = await getDropiProductInfoFromLocal(dropiId);
      if (!dropiProductInfo) {
        console.warn(`⚠️ [DROPI-ORDER] Producto ${dropiId} no encontrado en tabla dropi_products`);
        continue;
      }

      console.log(`✅ [DROPI-ORDER] Producto encontrado en BD local:`, {
        type: dropiProductInfo.type,
        hasVariations: !!dropiProductInfo.variationsData,
        variationsCount: dropiProductInfo.variationsData?.length || 0,
      });

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
          console.log(`🔍 [DROPI-ORDER] Buscando variación con SKU: ${variationSku}`);
          const variation = dropiProductInfo.variationsData.find(
            (v: any) => v.sku === variationSku
          );
          if (variation) {
            variationId = variation.id;
            console.log(`✅ [DROPI-ORDER] Variation ID encontrado: ${variationId}`);
          } else {
            console.warn(`⚠️ [DROPI-ORDER] No se encontró variación con SKU ${variationSku} en variationsData`);
          }
        }

        if (!variationId) {
          console.warn(
            `⚠️ [DROPI-ORDER] No se pudo determinar variation_id para producto VARIABLE ${dropiId}`
          );
          continue;
        }
      } else {
        console.log(`✅ [DROPI-ORDER] Producto SIMPLE, no requiere variation_id`);
      }

      // item.price es el precio BASE (sin incremento)
      // item.finalPrice es el precio con incremento (15% + $10,000)
      // Usar finalPrice si está disponible, sino calcularlo desde price
      const finalPrice = item.finalPrice || Math.round((item.price * 1.15) + 10000);
      
      const dropiProduct = {
        id: dropiId,
        price: finalPrice, // Precio con incremento (15% + $10,000)
        quantity: item.quantity,
        variation_id: variationId,
        orderItemId: item.id, // Guardar referencia al OrderItem
      };

      console.log(`✅ [DROPI-ORDER] Producto Dropi mapeado:`, {
        ...dropiProduct,
        originalPrice: item.price,
        finalPrice,
        increment: '15% + $10,000',
      });
      dropiProducts.push(dropiProduct);
    }

    console.log(`\n📊 [DROPI-ORDER] Resumen de mapeo:`, {
      itemsOriginales: order.items.length,
      productosMapeados: dropiProducts.length,
      productosDropi: dropiProducts.map(p => ({ id: p.id, quantity: p.quantity, variation_id: p.variation_id })),
    });

    if (dropiProducts.length === 0) {
      console.error(`❌ [DROPI-ORDER] No se pudieron mapear productos a Dropi`);
      throw new Error('No se pudieron mapear productos a Dropi');
    }

    // Determinar rate_type según método de pago
    // Según manual de Dropi: "CON RECAUDO" (contra entrega) o "SIN RECAUDO" (prepago)
    const rateType =
      order.paymentMethod === 'cash_on_delivery' ? 'CON RECAUDO' : 'SIN RECAUDO';
    
    console.log(`💰 [DROPI-ORDER] Rate type determinado:`, {
      paymentMethod: order.paymentMethod,
      rateType: rateType,
    });

    // Calcular shipping proporcional por producto
    const shippingTotal = order.shippingTotal || 0;
    const shippingPerProduct = Math.round(shippingTotal / dropiProducts.length);

    const dropiOrderIds: number[] = [];
    const errors: Array<{ item: string; error: string }> = [];
    let totalDropiShipping = 0; // Acumular shipping_total de todas las órdenes de Dropi
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

      console.log(`💰 [DROPI-ORDER] Totales para Dropi:`, {
        price: product.price, // Precio con incremento (15% + $10,000)
        quantity: product.quantity,
        productTotal,
        shippingPerProduct,
        shippingTotal,
        totalOrderWithShipping,
        finalTotalOrder,
      });

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
        shop_order_id: `${orderId}-${i + 1}`,
        products: [{
          ...product,
          price: product.price, // Ya incluye incremento (15% + $10,000)
        }],
      };

      try {
        const response = await fetch(`${DROPI_BASE_URL}/integrations/orders/myorders`, {
          method: 'POST',
          headers: {
            'dropi-integration-key': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dropiOrderBody),
          signal: AbortSignal.timeout(30000), // 30 segundos timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const dropiResponse = await response.json() as any;

        // Log completo de la respuesta de Dropi
        console.log(`\n📦 [DROPI-ORDER] ========== RESPUESTA COMPLETA DE DROPI (Producto ${i + 1}) ==========`);
        console.log(`📦 [DROPI-ORDER] Respuesta JSON completa:`, JSON.stringify(dropiResponse, null, 2));
        console.log(`📦 [DROPI-ORDER] isSuccess:`, dropiResponse.isSuccess);
        console.log(`📦 [DROPI-ORDER] message:`, dropiResponse.message);
        console.log(`📦 [DROPI-ORDER] objects:`, dropiResponse.objects);
        
        if (dropiResponse.objects) {
          console.log(`📦 [DROPI-ORDER] objects.id:`, dropiResponse.objects.id);
          console.log(`📦 [DROPI-ORDER] objects.order_id:`, dropiResponse.objects.order_id);
          console.log(`📦 [DROPI-ORDER] objects.orderNumber:`, dropiResponse.objects.orderNumber);
          console.log(`📦 [DROPI-ORDER] objects.shippingCost:`, dropiResponse.objects.shippingCost);
          console.log(`📦 [DROPI-ORDER] objects.shipping_cost:`, dropiResponse.objects.shipping_cost);
          // Buscar shippingCost en diferentes lugares de la respuesta
          console.log(`📦 [DROPI-ORDER] Buscando shippingCost en toda la respuesta...`);
          const allKeys = Object.keys(dropiResponse.objects);
          console.log(`📦 [DROPI-ORDER] Todas las claves en objects:`, allKeys);
          allKeys.forEach(key => {
            if (key.toLowerCase().includes('shipping') || key.toLowerCase().includes('envio')) {
              console.log(`📦 [DROPI-ORDER] Clave relacionada con shipping encontrada: ${key} =`, dropiResponse.objects[key]);
            }
          });
        }
        console.log(`📦 [DROPI-ORDER] ========== FIN RESPUESTA DROPI ==========\n`);

        if (!dropiResponse.isSuccess || !dropiResponse.objects) {
          throw new Error(
            dropiResponse.message || 'Dropi retornó isSuccess=false'
          );
        }

        const dropiOrderId = dropiResponse.objects.id || dropiResponse.objects.order_id;
        const dropiOrderNumber = dropiResponse.objects.orderNumber || dropiResponse.objects.order_id;
        
        // Buscar shippingCost en múltiples lugares posibles de la respuesta
        const dropiShippingCost = dropiResponse.objects.shippingCost 
          || dropiResponse.objects.shipping_cost 
          || dropiResponse.objects.shipping
          || dropiResponse.objects.cost
          || dropiResponse.objects.envio
          || (dropiResponse.objects.data && (dropiResponse.objects.data.shippingCost || dropiResponse.objects.data.shipping_cost))
          || 0;
        
        console.log(`💰 [DROPI-ORDER] ShippingCost extraído: ${dropiShippingCost} para producto ${i + 1}`);
        
        if (dropiOrderId) {
          dropiOrderIds.push(dropiOrderId);
          totalDropiShipping += dropiShippingCost;
          
          // Guardar información en OrderItem
          const orderItemId = (product as any).orderItemId;
          if (orderItemId) {
            await prisma.orderItem.update({
              where: { id: orderItemId },
              data: {
                dropiOrderId: dropiOrderId,
                dropiOrderNumber: dropiOrderNumber,
                dropiShippingCost: Math.round(dropiShippingCost),
                dropiStatus: 'PENDING',
                finalPrice: product.price, // Guardar el precio final con incremento
              },
            });
            console.log(`✅ [DROPI-ORDER] OrderItem actualizado: ${orderItemId}`, {
              dropiOrderId,
              dropiOrderNumber,
              dropiShippingCost: Math.round(dropiShippingCost),
              finalPrice: product.price,
            });
          }
          
          // Guardar respuesta completa en el array
          dropiResponses.push({
            dropiOrderId,
            response: dropiResponse,
            shippingTotal: dropiShippingCost,
          });
          
          console.log(
            `✅ [DROPI-ORDER] Orden creada en Dropi: ${dropiOrderId} (producto ${i + 1})`,
            {
              dropiOrderId,
              dropiOrderNumber,
              shippingCost: dropiShippingCost,
              totalDropiShippingAcumulado: totalDropiShipping,
            }
          );
        } else {
          throw new Error('Dropi no retornó order_id');
        }
      } catch (error: any) {
        console.error(
          `❌ [DROPI-ORDER] Error creando orden en Dropi para producto ${i + 1}:`,
          error?.message
        );
        errors.push({
          item: `Producto ${i + 1}`,
          error: error?.message || 'Error desconocido',
        });
      }
    }

    // Actualizar orden local con shipping_total y total calculados desde Dropi
    if (dropiOrderIds.length > 0) {
      console.log(`\n💾 [DROPI-ORDER] ========== ACTUALIZANDO ORDEN LOCAL ==========`);
      console.log(`💾 [DROPI-ORDER] dropiOrderIds:`, dropiOrderIds);
      console.log(`💾 [DROPI-ORDER] totalDropiShipping acumulado:`, totalDropiShipping);
      console.log(`💾 [DROPI-ORDER] responsesCount:`, dropiResponses.length);
      console.log(`💾 [DROPI-ORDER] Detalle de shippingCost por producto:`, 
        dropiResponses.map((r, idx) => ({
          producto: idx + 1,
          dropiOrderId: r.dropiOrderId,
          shippingCost: r.shippingTotal,
        }))
      );
      
      // Recalcular subtotal desde OrderItems (con finalPrice)
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
      });
      
      console.log(`💾 [DROPI-ORDER] OrderItems encontrados:`, orderItems.length);
      orderItems.forEach((item, idx) => {
        console.log(`💾 [DROPI-ORDER] Item ${idx + 1}:`, {
          id: item.id,
          finalPrice: item.finalPrice,
          quantity: item.quantity,
          subtotalItem: item.finalPrice * item.quantity,
          dropiShippingCost: item.dropiShippingCost,
        });
      });
      
      const recalculatedSubtotal = orderItems.reduce((sum, item) => {
        return sum + (item.finalPrice * item.quantity);
      }, 0);
      
      console.log(`💾 [DROPI-ORDER] Subtotal recalculado:`, recalculatedSubtotal);
      console.log(`💾 [DROPI-ORDER] ShippingTotal de Dropi:`, totalDropiShipping);
      
      // Calcular total final: subtotal + shippingTotal de Dropi
      const recalculatedTotal = recalculatedSubtotal + Math.round(totalDropiShipping);
      
      console.log(`💾 [DROPI-ORDER] Total recalculado:`, recalculatedTotal);
      console.log(`💾 [DROPI-ORDER] Desglose: ${recalculatedSubtotal} (subtotal) + ${Math.round(totalDropiShipping)} (shipping) = ${recalculatedTotal}`);
      
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
          // Actualizar shippingTotal con la suma de todos los envíos de Dropi
          shippingTotal: Math.round(totalDropiShipping),
          // Actualizar total: subtotal + shippingTotal
          total: recalculatedTotal,
          // Guardar respuestas completas de Dropi en metadata
          metadata: {
            ...currentMetadata,
            dropi_order_ids: dropiOrderIds,
            dropi_responses: dropiResponses,
            dropi_shipping_total: totalDropiShipping,
          },
        },
      });
      // Verificar que se actualizó correctamente
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          subtotal: true,
          shippingTotal: true,
          total: true,
        },
      });
      
      console.log(`✅ [DROPI-ORDER] Orden local actualizada en BD:`, {
        subtotal: updatedOrder?.subtotal,
        shippingTotal: updatedOrder?.shippingTotal,
        total: updatedOrder?.total,
      });
      console.log(`💾 [DROPI-ORDER] ========== FIN ACTUALIZACIÓN ORDEN LOCAL ==========\n`);
    } else {
      console.warn(`⚠️ [DROPI-ORDER] No se actualizó la orden porque no se crearon órdenes en Dropi`);
    }

    console.log(`\n📊 [DROPI-ORDER] Resumen final:`, {
      success: dropiOrderIds.length > 0,
      dropiOrderIds,
      errorsCount: errors.length,
      errors,
    });
    console.log(`📦 [DROPI-ORDER] ========== FIN CREACIÓN DE ORDEN EN DROPI ==========\n`);

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
}

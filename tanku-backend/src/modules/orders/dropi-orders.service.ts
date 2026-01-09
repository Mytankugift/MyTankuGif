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


    const orderAddress = order.orderAddresses && order.orderAddresses.length > 0 ? order.orderAddresses[0].address : null;
    if (!orderAddress) {
      console.error(`❌ [DROPI-ORDER] Orden ${orderId} no tiene dirección de envío`);
      throw new Error(`Orden ${orderId} no tiene dirección de envío`);
    }

    // Obtener token de Dropi
    const token = env.DROPI_STATIC_TOKEN;
    if (!token) {
      throw new Error('Token de Dropi no configurado');
    }

    // Mapear items a productos Dropi
    const dropiProducts: Array<{
      id: number;
      price: number;
      quantity: number;
      variation_id?: number | null;
    }> = [];

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];

      // Extraer dropi_id del SKU
      const dropiId = extractDropiIdFromSku(item.variant.sku);

      if (!dropiId) {
        continue;
      }

      // Obtener información del producto
      const dropiProductInfo = await getDropiProductInfoFromLocal(dropiId);
      if (!dropiProductInfo) {
        continue;
      }

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

      dropiProducts.push(dropiProduct);
    }


    if (dropiProducts.length === 0) {
      console.error(`❌ [DROPI-ORDER] No se pudieron mapear productos a Dropi`);
      throw new Error('No se pudieron mapear productos a Dropi');
    }

    // Determinar rate_type según método de pago
    // Según manual de Dropi: "CON RECAUDO" (contra entrega) o "SIN RECAUDO" (prepago)
    const rateType =
      order.paymentMethod === 'cash_on_delivery' ? 'CON RECAUDO' : 'SIN RECAUDO';
    

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

        if (!dropiResponse.isSuccess || !dropiResponse.objects) {
          console.error(`❌ [DROPI-ORDER] Error en respuesta de Dropi:`, dropiResponse.message);
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
          }
          
          // Guardar respuesta completa en el array
          dropiResponses.push({
            dropiOrderId,
            response: dropiResponse,
            shippingTotal: Math.round(discountedAmount),
          });
          
          console.log(`✅ [DROPI-ORDER] Orden ${dropiOrderId} creada en Dropi`);
        } else {
          throw new Error('Dropi no retornó order_id');
        }
      } catch (error: any) {
        errors.push({
          item: `Producto ${i + 1} (Dropi ID: ${product.id})`,
          error: error?.message || 'Error desconocido',
        });
      }
    }

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
}

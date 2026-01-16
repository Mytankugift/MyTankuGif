import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { OrdersService, CreateOrderInput } from './orders.service';
import { DropiOrdersService } from './dropi-orders.service';
import { CheckoutService, CheckoutOrderRequest, DataCart } from '../checkout/checkout.service';
import { StalkerGiftService } from '../stalker-gift/stalker-gift.service';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/AppError';

export class EpaycoController {
  private ordersService: OrdersService;
  private dropiOrdersService: DropiOrdersService;
  private checkoutService: CheckoutService;

  constructor() {
    this.ordersService = new OrdersService();
    this.dropiOrdersService = new DropiOrdersService();
    this.checkoutService = new CheckoutService();
  }

  /**
   * POST /api/v1/webhook/epayco/:cartId
   * Webhook de ePayco para confirmar pago
   * 
   * Este endpoint se llama cuando ePayco confirma el pago exitoso.
   * Crea la orden en el backend y luego crea la orden en Dropi.
   * 
   * NOTA: orderId en realidad es cartId para Epayco
   */
  webhook = async (req: Request, res: Response, next: NextFunction) => {
    // ✅ LOGGING DETALLADO AL INICIO - para diagnosticar 502
    console.log(`\n🔍 [EPAYCO-WEBHOOK-DEBUG] ========== REQUEST RECIBIDO ==========`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] Method: ${req.method}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] Path: ${req.path}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] URL completa: ${req.url}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] Params:`, req.params);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] Body (raw):`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] IP: ${req.ip}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] X-Real-IP: ${req.headers['x-real-ip']}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] X-Proxy-Key: ${req.headers['x-proxy-key'] || 'NO PRESENTE'}`);
    console.log(`🔍 [EPAYCO-WEBHOOK-DEBUG] ======================================\n`);

    try {
      const { orderId: cartId } = req.params; // En Epayco, esto es el cartId
      
      // ✅ ePayco envía datos como query parameters O en el body
      // Combinar ambos para soportar ambos formatos
      const webhookData = { ...req.query, ...req.body };
      
      // Extraer todos los parámetros del webhook (de query o body)
      const {
        ref_payco,
        x_ref_payco,
        x_transaction_id,
        x_response,
        x_response_reason_text,
        x_amount,
        x_currency_code,
        x_franchise,
        x_signature,
        x_test_request,
        x_approval_code,
        x_transaction_date,
        x_transaction_state,
        x_customer_email,
        x_customer_name,
        x_extra1,
        x_extra2,
      } = webhookData;

      // ✅ Convertir valores de query params a string si vienen como array
      // Express convierte query params duplicados en arrays
      const xRefPaycoValue = Array.isArray(x_ref_payco) ? x_ref_payco[0] : (x_ref_payco || ref_payco);
      const xTransactionIdValue = Array.isArray(x_transaction_id) ? x_transaction_id[0] : x_transaction_id;
      const xAmountValue = Array.isArray(x_amount) ? x_amount[0] : x_amount;
      const xCurrencyCodeValue = Array.isArray(x_currency_code) ? x_currency_code[0] : x_currency_code;
      const xSignatureValue = Array.isArray(x_signature) ? x_signature[0] : x_signature;
      const xResponseValue = Array.isArray(x_response) ? x_response[0] : x_response;
      const xResponseReasonTextValue = Array.isArray(x_response_reason_text) ? x_response_reason_text[0] : x_response_reason_text;
      const xTestRequestValue = Array.isArray(x_test_request) ? x_test_request[0] : x_test_request;

      const transactionId = xTransactionIdValue || webhookData.transactionId;
      const paymentStatus = xResponseValue || webhookData.paymentStatus || 'captured';

      // Log completo del webhook recibido
      console.log(`\n💰 [EPAYCO-WEBHOOK] ========== WEBHOOK RECIBIDO ==========`);
      console.log(`💰 [EPAYCO-WEBHOOK] Cart ID: ${cartId}`);
      console.log(`💰 [EPAYCO-WEBHOOK] Ref Payco: ${xRefPaycoValue}`);
      console.log(`💰 [EPAYCO-WEBHOOK] Transaction ID: ${transactionId}`);
      console.log(`💰 [EPAYCO-WEBHOOK] Response: ${xResponseValue}`);
      console.log(`💰 [EPAYCO-WEBHOOK] Amount: ${xAmountValue}`);
      console.log(`💰 [EPAYCO-WEBHOOK] Currency: ${xCurrencyCodeValue}`);
      console.log(`💰 [EPAYCO-WEBHOOK] Query params:`, JSON.stringify(req.query, null, 2));
      console.log(`💰 [EPAYCO-WEBHOOK] Body:`, JSON.stringify(req.body, null, 2));
      console.log(`💰 [EPAYCO-WEBHOOK] Datos combinados:`, JSON.stringify(webhookData, null, 2));
      console.log(`💰 [EPAYCO-WEBHOOK] ======================================\n`);

      // 1. VALIDAR FIRMA DE SEGURIDAD
      const p_cust_id_cliente = process.env.EPAYCO_CUSTOMER_ID;
      const p_key = process.env.EPAYCO_P_KEY;

      if (!p_cust_id_cliente || !p_key) {
        console.error('❌ [EPAYCO-WEBHOOK] EPAYCO_CUSTOMER_ID o EPAYCO_P_KEY no configurados');
        // En modo test, continuar sin validar firma
        if (process.env.NODE_ENV === 'development' || xTestRequestValue === 'true') {
          console.warn('⚠️ [EPAYCO-WEBHOOK] Modo test/desarrollo - continuando sin validar firma');
        } else {
          return res.status(500).json({
            success: false,
            error: 'Configuración de ePayco incompleta',
          });
        }
      }

      if (xSignatureValue && p_cust_id_cliente && p_key) {
        // ✅ Calcular la firma esperada usando valores convertidos
        const signatureString = `${p_cust_id_cliente}^${p_key}^${xRefPaycoValue}^${xTransactionIdValue}^${xAmountValue}^${xCurrencyCodeValue}`;
        const calculatedSignature = crypto
          .createHash('sha256')
          .update(signatureString)
          .digest('hex');

        if (calculatedSignature !== xSignatureValue) {
          console.error('❌ [EPAYCO-WEBHOOK] Firma inválida - posible intento de fraude');
          console.error(`❌ [EPAYCO-WEBHOOK] Firma recibida: ${xSignatureValue}`);
          console.error(`❌ [EPAYCO-WEBHOOK] Firma calculada: ${calculatedSignature}`);
          console.error(`❌ [EPAYCO-WEBHOOK] String de firma: ${signatureString}`);
          return res.status(400).json({
            success: false,
            error: 'Invalid signature',
          });
        }
        console.log('✅ [EPAYCO-WEBHOOK] Firma validada correctamente');
      } else {
        if (xTestRequestValue === 'true' || process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [EPAYCO-WEBHOOK] No se recibió firma de seguridad (modo test/desarrollo)');
        } else {
          console.warn('⚠️ [EPAYCO-WEBHOOK] No se recibió firma de seguridad');
        }
      }

      // 2. VALIDAR QUE NO SEA TRANSACCIÓN DUPLICADA
      // TODO: Implementar consulta a base de datos para verificar x_transaction_id
      // const existingTransaction = await checkTransactionExists(x_transaction_id);
      // if (existingTransaction) {
      //   console.log('⚠️ [EPAYCO-WEBHOOK] Transacción ya procesada:', x_transaction_id);
      //   return res.status(200).json({ success: true, message: 'Transacción ya procesada' });
      // }

      // 3. MAPEAR ESTADO DE EPAYCO
      // ✅ ePayco puede enviar estados como strings ("Rechazada") o números ("3")
      let finalPaymentStatus: string;
      const xResponseStr = String(xResponseValue || '').trim();

      switch (xResponseStr) {
        case 'Aceptada':
        case 'Aprobada':
        case '1':  // ✅ Valor numérico para pago exitoso
          finalPaymentStatus = 'paid';
          break;
        case 'Rechazada':
        case 'Rechazado':
        case '3':  // ✅ Valor numérico para pago rechazado
          finalPaymentStatus = 'cancelled';
          break;
        case 'Pendiente':
        case '2':  // ✅ Valor numérico para pago pendiente
          finalPaymentStatus = 'pending';
          break;
        case 'Fallida':
        case '4':  // ✅ Valor numérico para pago fallido
          finalPaymentStatus = 'cancelled';
          break;
        default:
          // Fallback para otros formatos
          const paymentStatusStr = String(paymentStatus || '').trim();
          switch (paymentStatusStr) {
            case 'captured':
            case 'paid':
            case '1':
              finalPaymentStatus = 'paid';
              break;
            case 'cancelled':
            case '3':
            case '4':
              finalPaymentStatus = 'cancelled';
              break;
            case 'pending':
            case '2':
              finalPaymentStatus = 'pending';
              break;
            default:
              // ✅ Si no reconoce el estado, loguear y usar cancelled por defecto (más seguro)
              console.warn(`⚠️ [EPAYCO-WEBHOOK] Estado desconocido: "${xResponseStr}" (raw: ${xResponseValue}), usando 'cancelled'`);
              finalPaymentStatus = 'cancelled';
          }
      }
      
      console.log(`💰 [EPAYCO-WEBHOOK] Estado mapeado: "${xResponseStr}" -> ${finalPaymentStatus}`);

      // Si el pago NO fue exitoso, no crear orden y retornar
      if (finalPaymentStatus !== 'paid') {
        console.log(`⚠️ [EPAYCO-WEBHOOK] Pago NO exitoso. Estado: ${finalPaymentStatus}. No se creará orden.`);
        return res.status(200).json({
          success: true,
          message: 'Pago no exitoso, orden no creada',
          paymentStatus: finalPaymentStatus,
        });
      }

      // Obtener datos del checkout guardados en metadata del carrito
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        select: { metadata: true },
      });

      if (!cart || !cart.metadata || typeof cart.metadata !== 'object') {
        throw new NotFoundError(`Carrito ${cartId} no encontrado o sin datos de checkout`);
      }

      const metadata = cart.metadata as any;

      // Verificar si es un StalkerGift
      if (metadata.isStalkerGift && metadata.stalkerGiftId) {
        console.log(`🎁 [EPAYCO-WEBHOOK] Detectado StalkerGift: ${metadata.stalkerGiftId}`);

        // Actualizar StalkerGift
        const stalkerGiftService = new StalkerGiftService();

        // Actualizar estado de pago
        // paymentId es refPayco, transactionId es x_transaction_id
        const updatedStalkerGift = await stalkerGiftService.updatePaymentStatus(
          metadata.stalkerGiftId,
          'paid',
          xRefPaycoValue || ref_payco, // paymentId
          transactionId // transactionId
        );

        // updatePaymentStatus ya cambia el estado a WAITING_ACCEPTANCE
        // - Si receiverId existe (usuario Tanku): envía notificación, NO genera link
        // - Si receiverId es null (usuario externo): genera link único
        const uniqueLink = updatedStalkerGift.uniqueLink;
        
        if (updatedStalkerGift.receiverId) {
          console.log(`✅ [EPAYCO-WEBHOOK] StalkerGift actualizado: ${metadata.stalkerGiftId}`);
          console.log(`✅ [EPAYCO-WEBHOOK] Notificación enviada a usuario Tanku: ${updatedStalkerGift.receiverId}`);
        } else {
          // Usuario externo: verificar que se generó el link
          if (!uniqueLink) {
            // Si no se generó automáticamente, generarlo manualmente
            const generatedLink = await stalkerGiftService.generateUniqueLink(metadata.stalkerGiftId);
            console.log(`✅ [EPAYCO-WEBHOOK] StalkerGift actualizado: ${metadata.stalkerGiftId}`);
            console.log(`✅ [EPAYCO-WEBHOOK] Link único generado: ${generatedLink}`);
          } else {
            console.log(`✅ [EPAYCO-WEBHOOK] StalkerGift actualizado: ${metadata.stalkerGiftId}`);
            console.log(`✅ [EPAYCO-WEBHOOK] Link único ya existente: ${uniqueLink}`);
          }
        }

        return res.status(200).json({
          success: true,
          message: 'StalkerGift pagado exitosamente',
          stalkerGiftId: metadata.stalkerGiftId,
          paymentStatus: 'paid',
        });
      }

      // Flujo normal de checkout (Order)
      const checkoutData = metadata.checkout_data;

      if (!checkoutData) {
        throw new NotFoundError(`No se encontraron datos de checkout para el carrito ${cartId}`);
      }

      console.log(`📝 [EPAYCO-WEBHOOK] Creando orden desde datos del checkout...`);

      // Crear la orden usando los datos guardados
      const order = await this.checkoutService.createOrderFromCheckout(
        checkoutData.dataForm as CheckoutOrderRequest,
        checkoutData.dataCart as DataCart,
        checkoutData.userId
      );

      console.log(`✅ [EPAYCO-WEBHOOK] Orden creada: ${order.id}`);

      // Actualizar estado de pago de la orden
      console.log(`📝 [EPAYCO-WEBHOOK] Actualizando estado de pago: ${order.id} -> ${finalPaymentStatus}`);
      
      // ✅ Guardar ambos IDs: transactionId (x_transaction_id) y refPayco (x_ref_payco)
      // Usar valores convertidos
      const refPaycoValue = xRefPaycoValue || ref_payco;
      console.log(`📝 [EPAYCO-WEBHOOK] Guardando IDs - transactionId: ${transactionId}, refPayco: ${refPaycoValue}`);
      
      const updatedOrder = await this.ordersService.updatePaymentStatus(
        order.id,
        finalPaymentStatus,
        transactionId,
        {
          refPayco: refPaycoValue,
          x_transaction_id: xTransactionIdValue,
          x_ref_payco: xRefPaycoValue,
        }
      );

      console.log(`✅ [EPAYCO-WEBHOOK] Estado de pago actualizado exitosamente`);
      console.log(`✅ [EPAYCO-WEBHOOK] Orden actualizada:`, {
        id: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        transactionId: updatedOrder.transactionId,
        paymentMethod: updatedOrder.paymentMethod,
      });

      // Crear orden en Dropi (ya sabemos que el pago fue exitoso)
      let dropiSuccess = false;
      try {
        console.log(`\n📦 [EPAYCO-WEBHOOK] ========== CREANDO ORDEN EN DROPI ==========`);
        console.log(`📦 [EPAYCO-WEBHOOK] Order ID: ${updatedOrder.id}`);
        console.log(`📦 [EPAYCO-WEBHOOK] Payment Method: ${updatedOrder.paymentMethod}`);
        console.log(`📦 [EPAYCO-WEBHOOK] Payment Status: ${updatedOrder.paymentStatus}`);
        console.log(`📦 [EPAYCO-WEBHOOK] Transaction ID: ${updatedOrder.transactionId}`);
        console.log(`📦 [EPAYCO-WEBHOOK] Iniciando creación en Dropi...`);
        const dropiResult = await this.dropiOrdersService.createOrderInDropi(updatedOrder.id);
        console.log(`📦 [EPAYCO-WEBHOOK] Resultado de Dropi:`, JSON.stringify(dropiResult, null, 2));

        if (dropiResult.success && dropiResult.dropiOrderIds.length > 0) {
          dropiSuccess = true;
          console.log(
            `✅ [EPAYCO-WEBHOOK] Orden creada exitosamente en Dropi: ${dropiResult.dropiOrderIds.join(', ')}`
          );
          console.log(`📦 [EPAYCO-WEBHOOK] ========== ORDEN EN DROPI CREADA EXITOSAMENTE ==========\n`);
        } else {
          console.warn(
            `⚠️ [EPAYCO-WEBHOOK] Error creando orden en Dropi:`,
            dropiResult.errors
          );
          console.warn(`📦 [EPAYCO-WEBHOOK] ========== ERROR AL CREAR ORDEN EN DROPI ==========\n`);
        }

        // Vaciar carrito solo si Dropi fue exitoso
        if (dropiSuccess) {
          try {
            console.log(`🧹 [EPAYCO-WEBHOOK] Eliminando items del carrito: ${cartId}`);
            const cartWithItems = await prisma.cart.findUnique({
              where: { id: cartId },
              include: { items: true },
            });

            if (cartWithItems && cartWithItems.items.length > 0) {
              for (const item of cartWithItems.items) {
                await prisma.cartItem.delete({
                  where: { id: item.id },
                });
              }
              console.log(`✅ [EPAYCO-WEBHOOK] Carrito vaciado exitosamente`);
            }
          } catch (cartError: any) {
            console.warn(`⚠️ [EPAYCO-WEBHOOK] Error limpiando carrito:`, cartError?.message);
          }
        } else {
          console.warn(`⚠️ [EPAYCO-WEBHOOK] NO se vació el carrito porque Dropi falló`);
        }

        const responseData = {
          success: true,
          message: 'Pago confirmado y orden procesada',
          order: {
            id: updatedOrder.id,
            paymentStatus: updatedOrder.paymentStatus,
            dropiOrderIds: updatedOrder.items?.map((item: any) => item.dropiOrderId).filter(Boolean) || [],
          },
          dropiOrder: {
            success: dropiResult.success,
            dropiOrderIds: dropiResult.dropiOrderIds,
            errors: dropiResult.errors,
          },
        };

        console.log(`✅ [EPAYCO-WEBHOOK] Respuesta del webhook:`, JSON.stringify(responseData, null, 2));
        res.status(200).json(responseData);
      } catch (dropiError: any) {
        console.error(`❌ [EPAYCO-WEBHOOK] Error creando orden en Dropi:`, dropiError);
        console.error(`❌ [EPAYCO-WEBHOOK] Stack trace:`, dropiError?.stack);
        
        // NO vaciar carrito si Dropi falla
        console.warn(`⚠️ [EPAYCO-WEBHOOK] NO se vació el carrito porque Dropi falló`);
        
        const errorResponse = {
          success: true,
          message: 'Pago confirmado, pero error al crear orden en Dropi',
          order: {
            id: updatedOrder.id,
            paymentStatus: updatedOrder.paymentStatus,
          },
          dropiOrder: {
            success: false,
            error: dropiError?.message || 'Error desconocido',
          },
        };
        
        console.log(`⚠️ [EPAYCO-WEBHOOK] Respuesta del webhook (con error Dropi):`, JSON.stringify(errorResponse, null, 2));
        res.status(200).json(errorResponse);
      }
    } catch (error: any) {
      console.error(`\n❌ [EPAYCO-WEBHOOK] ========== ERROR PROCESANDO WEBHOOK ==========`);
      console.error(`❌ [EPAYCO-WEBHOOK] Error:`, error?.message);
      console.error(`❌ [EPAYCO-WEBHOOK] Stack:`, error?.stack);
      console.error(`❌ [EPAYCO-WEBHOOK] Body recibido:`, JSON.stringify(req.body, null, 2));
      console.error(`❌ [EPAYCO-WEBHOOK] ============================================\n`);
      next(error);
    }
  };
}

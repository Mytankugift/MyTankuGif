import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getOrderStatusNotificationCopy,
  getStalkerGiftOrderNotificationCopy,
} from '../notifications/order-notification-copy';
import {
  dropiOrderSyncService,
  hasDropiHistoryInStoredData,
} from './dropi-order-sync.service';

// Interfaz basada en el ejemplo oficial de Dropi
interface DropiWebhook {
  id: number;
  status: string;
  shop_order_id?: string;
  shipping_guide?: string;
  shipping_company?: string;
  sticker?: string;
  notes?: string;
}

export class DropiWebhookController {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  /**
   * POST /api/v1/webhook/dropi (o /api/v1/webhook/dropi)
   * Webhook de Dropi para actualizar estado de órdenes
   * 
   * Payload esperado (según documentación oficial de Dropi):
   * {
   *   id: number,                    // dropiOrderId (requerido)
   *   status: string,                // nuevo estado (requerido)
   *   shop_order_id?: string,        // tu ID interno de orden (opcional)
   *   shipping_guide?: string,       // número de guía (opcional)
   *   shipping_company?: string,     // empresa de envío (opcional)
   *   sticker?: string,              // ID del sticker/guía (opcional)
   *   notes?: string                 // notas/descripción (opcional)
   * }
   */
  webhook = async (req: Request, res: Response, next: NextFunction) => {
    // ✅ LOGGING DETALLADO AL INICIO - para diagnosticar problemas
    console.log(`\n🔍 [DROPI-WEBHOOK-DEBUG] ========== REQUEST RECIBIDO ==========`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Method: ${req.method}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Path: ${req.path}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] URL completa: ${req.url}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Content-Type: ${req.headers['content-type'] || 'NO PRESENTE'}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Body type: ${typeof req.body}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Body keys: ${req.body ? Object.keys(req.body).join(', ') : 'null/undefined'}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Body (raw):`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] IP: ${req.ip}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] X-Real-IP: ${req.headers['x-real-ip']}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] X-Proxy-Key: ${req.headers['x-proxy-key'] || 'NO PRESENTE'}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] ======================================\n`);

    // ✅ Validar que el body existe y está parseado correctamente
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      console.warn(`⚠️ [DROPI-WEBHOOK] Body vacío o inválido`);
      console.warn(`⚠️ [DROPI-WEBHOOK] Content-Type recibido: ${req.headers['content-type']}`);
      // Responder 200 para que Dropi no reenvíe
      return res.status(200).json({ 
        success: false, 
        message: 'Body vacío o inválido (revisar Content-Type)' 
      });
    }

    try {
      // Extraer todos los campos según interfaz oficial de Dropi
      const { 
        id: dropiOrderId, 
        status, 
        shop_order_id, 
        shipping_guide, 
        shipping_company, 
        sticker, 
        notes 
      } = req.body as DropiWebhook;

      // Validación mínima (campos requeridos)
      if (!dropiOrderId || !status) {
        console.warn(`⚠️ [DROPI-WEBHOOK] Payload inválido: campos requeridos faltantes`);
        console.warn(`⚠️ [DROPI-WEBHOOK] Body recibido:`, req.body);
        // Responder 200 en lugar de 400 para evitar reenvíos de Dropi
        return res.status(200).json({ 
          success: false, 
          message: 'Campos requeridos: id, status' 
        });
      }

      console.log(`📦 [DROPI-WEBHOOK] Orden #${dropiOrderId} → ${status}`);
      if (shop_order_id) {
        console.log(`📦 [DROPI-WEBHOOK] shop_order_id: ${shop_order_id}`);
      }

      // Buscar OrderItem por dropiOrderId O por shop_order_id (orderId)
      // Según ejemplo oficial de Dropi, busca por ambos para mayor flexibilidad
      // Incluir relación stalkerGift para detectar si es StalkerGift
      const orderItem = await prisma.orderItem.findFirst({
        where: {
          OR: [
            { dropiOrderId: Number(dropiOrderId) },
            ...(shop_order_id ? [{ orderId: shop_order_id }] : []),
          ],
        },
        include: {
          order: {
            include: {
              stalkerGift: true,
            },
          },
        },
      });

      if (!orderItem) {
        // Orden no encontrada: puede ser orden no creada por nosotros
        console.warn(`⚠️ [DROPI-WEBHOOK] OrderItem no encontrado para dropiOrderId: ${dropiOrderId}${shop_order_id ? ` o shop_order_id: ${shop_order_id}` : ''}`);
        // Responder 200 para que Dropi no reenvíe
        return res.status(200).json({ 
          success: true, 
          message: 'Orden no encontrada (puede ser de otro sistema)' 
        });
      }

      const dropiOrderIdNum = Number(dropiOrderId);

      // Idempotencia: si el estado no cambió, solo re-sincronizar si aún no hay historial en BD
      if (orderItem.dropiStatus === status) {
        if (
          !hasDropiHistoryInStoredData(orderItem.dropiWebhookData) &&
          orderItem.dropiOrderId
        ) {
          console.log(
            `📦 [DROPI-WEBHOOK] Estado sin cambio; encolando sync por historial faltante`
          );
          res.status(200).json({
            success: true,
            message: 'Estado ya actualizado; sincronización de historial encolada',
          });
          dropiOrderSyncService.scheduleSyncOrderItem(orderItem.id, orderItem.dropiOrderId, {
            source: 'webhook_backfill',
          });
          return;
        }
        console.log(`✅ [DROPI-WEBHOOK] Estado ya actualizado: ${status} (idempotencia)`);
        return res.status(200).json({
          success: true,
          message: 'Estado ya actualizado',
        });
      }

      const oldStatus = orderItem.dropiStatus;

      // Guardar referencias antes de actualizar (para evitar problemas de tipos)
      // Usar 'as any' temporalmente para evitar errores de tipo en Prisma
      const order = (orderItem as any).order;
      const orderId = order.id;
      const orderUserId = order.userId;
      const isStalkerGift = order.isStalkerGift;
      const stalkerGift = order.stalkerGift;

      // Construir URL de guía si viene GUIA_GENERADA con sticker y shipping_company
      let guideUrl: string | null = null;
      if (status === 'GUIA_GENERADA' && sticker && shipping_company) {
        guideUrl = `https://api.dropi.co/integrations/guias/${shipping_company}/${sticker}`;
        console.log(`📦 [DROPI-WEBHOOK] URL de guía generada: ${guideUrl}`);
      }

      // Guardar el payload completo del webhook con información adicional
      const webhookPayload: DropiWebhook & { 
        receivedAt: string; 
        guideUrl?: string | null;
      } = {
        ...req.body,
        receivedAt: new Date().toISOString(),
        ...(guideUrl ? { guideUrl } : {}),
      };

      // Actualizar dropiStatus y guardar el payload completo
      // El payload incluye: shipping_guide, shipping_company, sticker, notes, guideUrl
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { 
          dropiStatus: status,
          dropiWebhookData: webhookPayload as any,
        },
      });

      console.log(`✅ [DROPI-WEBHOOK] Estado actualizado: ${oldStatus || 'null'} → ${status}`);
      if (shipping_guide) {
        console.log(`✅ [DROPI-WEBHOOK] Guía de envío: ${shipping_guide}`);
      }
      if (notes) {
        console.log(`✅ [DROPI-WEBHOOK] Notas: ${notes}`);
      }

      // Notificación agrupada (una fila por orden, se actualiza en cada cambio de estado)
      const statusInfo = getOrderStatusNotificationCopy(status);
      const notificationData = {
        orderId: orderId,
        orderItemId: orderItem.id,
        dropiOrderId: dropiOrderId,
        oldStatus: oldStatus,
        newStatus: status,
        ...(shipping_guide ? { shippingGuide: shipping_guide } : {}),
        ...(guideUrl ? { guideUrl } : {}),
        ...(notes ? { notes } : {}),
      };

      if (isStalkerGift && stalkerGift) {
        const receiverCopy = getStalkerGiftOrderNotificationCopy('receiver', status);
        try {
          await this.notificationsService.syncOrderUpdateNotification({
            userId: orderUserId,
            type: 'stalkergift_order_update',
            orderId,
            title: receiverCopy.title,
            message: receiverCopy.message,
            data: { ...notificationData, stalkerGiftId: stalkerGift.id },
          });
          console.log(`✅ [DROPI-WEBHOOK] Notificación sincronizada para receiver: ${orderUserId}`);
        } catch (notificationError: any) {
          console.error(`⚠️ [DROPI-WEBHOOK] Error notificando receiver:`, notificationError?.message);
        }

        if (stalkerGift.senderId) {
          const senderCopy = getStalkerGiftOrderNotificationCopy('sender', status);
          try {
            await this.notificationsService.syncOrderUpdateNotification({
              userId: stalkerGift.senderId,
              type: 'stalkergift_order_update',
              orderId,
              title: senderCopy.title,
              message: senderCopy.message,
              data: { ...notificationData, stalkerGiftId: stalkerGift.id },
            });
            console.log(`✅ [DROPI-WEBHOOK] Notificación sincronizada para sender: ${stalkerGift.senderId}`);
          } catch (notificationError: any) {
            console.error(`⚠️ [DROPI-WEBHOOK] Error notificando sender:`, notificationError?.message);
          }
        }
      } else {
        try {
          await this.notificationsService.syncOrderUpdateNotification({
            userId: orderUserId,
            type: 'order_update',
            orderId,
            title: statusInfo.title,
            message: statusInfo.message,
            data: notificationData,
          });
          console.log(`✅ [DROPI-WEBHOOK] Notificación sincronizada para usuario: ${orderUserId}`);
        } catch (notificationError: any) {
          console.error(`⚠️ [DROPI-WEBHOOK] Error sincronizando notificación:`, notificationError?.message);
        }
      }

      // Responder 200 OK antes de consultar myorders (evita reintentos de Dropi)
      res.status(200).json({
        success: true,
        message: 'Estado actualizado',
        dropiOrderId,
        orderItemId: orderItem.id,
        oldStatus,
        newStatus: status,
      });

      if (orderItem.dropiOrderId) {
        dropiOrderSyncService.scheduleSyncOrderItem(orderItem.id, orderItem.dropiOrderId, {
          source: 'webhook',
          guideUrl,
        });
      } else if (dropiOrderIdNum) {
        dropiOrderSyncService.scheduleSyncOrderItem(orderItem.id, dropiOrderIdNum, {
          source: 'webhook',
          guideUrl,
        });
      }

    } catch (error: any) {
      console.error(`❌ [DROPI-WEBHOOK] Error:`, error?.message);
      console.error(`❌ [DROPI-WEBHOOK] Stack:`, error?.stack);
      console.error(`❌ [DROPI-WEBHOOK] Body recibido:`, JSON.stringify(req.body, null, 2));
      
      // Responder 200 para que Dropi no reenvíe en caso de error interno
      res.status(200).json({ 
        success: false, 
        message: 'Error procesando webhook (revisar logs)' 
      });
    }
  };
}


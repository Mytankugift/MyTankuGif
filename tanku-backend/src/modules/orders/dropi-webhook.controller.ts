import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotificationsService } from '../notifications/notifications.service';

export class DropiWebhookController {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  /**
   * Mapear estado de Dropi a mensaje amigable
   */
  private getStatusMessage(status: string): { title: string; message: string } {
    const statusUpper = status.toUpperCase();
    
    // Mapeo de estados conocidos (extensible)
    const statusMap: Record<string, { title: string; message: string }> = {
      'PENDING': {
        title: 'Orden pendiente',
        message: 'Tu orden está siendo procesada por el proveedor',
      },
      'PROCESSING': {
        title: 'Orden en proceso',
        message: 'El proveedor está preparando tu pedido',
      },
      'SHIPPED': {
        title: 'Orden enviada',
        message: 'Tu pedido ha sido enviado y está en camino',
      },
      'DELIVERED': {
        title: 'Orden entregada',
        message: 'Tu pedido ha sido entregado exitosamente',
      },
      'CANCELLED': {
        title: 'Orden cancelada',
        message: 'Tu orden ha sido cancelada',
      },
      'REJECTED': {
        title: 'Orden rechazada',
        message: 'El proveedor ha rechazado tu orden',
      },
    };

    // Si conocemos el estado, usar mensaje específico
    if (statusMap[statusUpper]) {
      return statusMap[statusUpper];
    }

    // Estado desconocido: mensaje genérico
    return {
      title: 'Actualización de orden',
      message: `El estado de tu orden ha cambiado a: ${status}`,
    };
  }

  /**
   * POST /api/v1/webhook/dropi
   * Webhook de Dropi para actualizar estado de órdenes
   * 
   * Payload esperado:
   * {
   *   id: number,           // dropiOrderId
   *   status: string,       // nuevo estado
   *   orderdetails?: any[]  // productos (opcional)
   * }
   */
  webhook = async (req: Request, res: Response, next: NextFunction) => {
    // ✅ LOGGING DETALLADO AL INICIO - para diagnosticar 502
    console.log(`\n🔍 [DROPI-WEBHOOK-DEBUG] ========== REQUEST RECIBIDO ==========`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Method: ${req.method}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Path: ${req.path}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] URL completa: ${req.url}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] Body (raw):`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] IP: ${req.ip}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] X-Real-IP: ${req.headers['x-real-ip']}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] X-Proxy-Key: ${req.headers['x-proxy-key'] || 'NO PRESENTE'}`);
    console.log(`🔍 [DROPI-WEBHOOK-DEBUG] ======================================\n`);

    try {
      const { id: dropiOrderId, status } = req.body;

      // Validación mínima
      if (!dropiOrderId || !status) {
        console.warn(`⚠️ [DROPI-WEBHOOK] Payload inválido:`, req.body);
        return res.status(400).json({ 
          success: false, 
          message: 'id y status son requeridos' 
        });
      }

      console.log(`📦 [DROPI-WEBHOOK] Recibido: dropiOrderId=${dropiOrderId}, status=${status}`);

      // Buscar OrderItem por dropiOrderId (incluyendo Order para obtener userId)
      const orderItem = await prisma.orderItem.findFirst({
        where: { dropiOrderId: Number(dropiOrderId) },
        include: {
          order: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      if (!orderItem) {
        // Orden no encontrada: puede ser orden no creada por nosotros
        console.warn(`⚠️ [DROPI-WEBHOOK] OrderItem no encontrado para dropiOrderId: ${dropiOrderId}`);
        // Responder 200 para que Dropi no reenvíe
        return res.status(200).json({ 
          success: true, 
          message: 'Orden no encontrada (puede ser de otro sistema)' 
        });
      }

      // Idempotencia: solo actualizar si el estado cambió
      if (orderItem.dropiStatus === status) {
        console.log(`✅ [DROPI-WEBHOOK] Estado ya actualizado: ${status} (idempotencia)`);
        return res.status(200).json({ 
          success: true, 
          message: 'Estado ya actualizado' 
        });
      }

      const oldStatus = orderItem.dropiStatus;

      // Guardar el payload completo del webhook
      const webhookPayload = {
        ...req.body,
        receivedAt: new Date().toISOString(),
      };

      // Actualizar dropiStatus y guardar el payload completo
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { 
          dropiStatus: status,
          dropiWebhookData: webhookPayload as any,
        },
      });

      console.log(`✅ [DROPI-WEBHOOK] Estado actualizado: ${oldStatus} → ${status}`);

      // Crear notificación para el usuario
      const statusInfo = this.getStatusMessage(status);
      
      try {
        await this.notificationsService.createNotification({
          userId: orderItem.order.userId,
          type: 'order_update',
          title: statusInfo.title,
          message: statusInfo.message,
          data: {
            orderId: orderItem.order.id,
            orderItemId: orderItem.id,
            dropiOrderId: dropiOrderId,
            oldStatus: oldStatus,
            newStatus: status,
          },
        });

        console.log(`✅ [DROPI-WEBHOOK] Notificación creada para usuario: ${orderItem.order.userId}`);
      } catch (notificationError: any) {
        // No fallar el webhook si la notificación falla
        console.error(`⚠️ [DROPI-WEBHOOK] Error creando notificación:`, notificationError?.message);
      }

      // Responder 200 OK rápido (sin lógica pesada)
      res.status(200).json({ 
        success: true, 
        message: 'Estado actualizado',
        dropiOrderId,
        oldStatus,
        newStatus: status,
      });

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


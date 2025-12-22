import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service';
import { DropiOrdersService } from './dropi-orders.service';

export class EpaycoController {
  private ordersService: OrdersService;
  private dropiOrdersService: DropiOrdersService;

  constructor() {
    this.ordersService = new OrdersService();
    this.dropiOrdersService = new DropiOrdersService();
  }

  /**
   * POST /api/v1/webhook/epayco/:orderId
   * Webhook de ePayco para confirmar pago
   * 
   * Este endpoint se llama cuando ePayco confirma el pago exitoso.
   * Actualiza el estado de la orden y crea la orden en Dropi.
   */
  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const { transactionId, paymentStatus } = req.body;

      console.log(`💰 [EPAYCO] Webhook recibido para orden: ${orderId}`);
      console.log(`💰 [EPAYCO] Transaction ID: ${transactionId}`);
      console.log(`💰 [EPAYCO] Payment Status: ${paymentStatus || 'captured'}`);

      // Actualizar estado de pago de la orden
      const finalPaymentStatus = paymentStatus || 'captured';
      const order = await this.ordersService.updatePaymentStatus(
        orderId,
        finalPaymentStatus,
        transactionId
      );

      console.log(`✅ [EPAYCO] Estado de pago actualizado: ${orderId} -> ${finalPaymentStatus}`);

      // Si el pago fue exitoso, crear orden en Dropi
      if (finalPaymentStatus === 'captured' || finalPaymentStatus === 'paid') {
        try {
          console.log(`📦 [EPAYCO] Creando orden en Dropi...`);
          const dropiResult = await this.dropiOrdersService.createOrderInDropi(orderId);

          if (dropiResult.success) {
            console.log(
              `✅ [EPAYCO] Orden creada en Dropi: ${dropiResult.dropiOrderIds.join(', ')}`
            );
          } else {
            console.warn(
              `⚠️ [EPAYCO] Error creando orden en Dropi:`,
              dropiResult.errors
            );
          }

          res.status(200).json({
            success: true,
            message: 'Pago confirmado y orden procesada',
            order: {
              id: order.id,
              paymentStatus: order.paymentStatus,
              dropiOrderIds: order.items?.map(item => item.dropiOrderId).filter(Boolean) || [],
            },
            dropiOrder: {
              success: dropiResult.success,
              dropiOrderIds: dropiResult.dropiOrderIds,
              errors: dropiResult.errors,
            },
          });
        } catch (dropiError: any) {
          // No fallar el webhook si Dropi falla (la orden ya está pagada)
          console.error(`❌ [EPAYCO] Error creando orden en Dropi:`, dropiError);
          res.status(200).json({
            success: true,
            message: 'Pago confirmado, pero error al crear orden en Dropi',
            order: {
              id: order.id,
              paymentStatus: order.paymentStatus,
            },
            dropiOrder: {
              success: false,
              error: dropiError?.message || 'Error desconocido',
            },
          });
        }
      } else {
        // Pago no exitoso, solo actualizar estado
        res.status(200).json({
          success: true,
          message: 'Estado de pago actualizado',
          order: {
            id: order.id,
            paymentStatus: order.paymentStatus,
          },
        });
      }
    } catch (error: any) {
      console.error(`❌ [EPAYCO] Error procesando webhook:`, error);
      next(error);
    }
  };
}

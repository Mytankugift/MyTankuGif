/**
 * Gift Controller
 * 
 * Controlador para gestionar regalos entre usuarios
 */

import { Request, Response, NextFunction } from 'express';
import { GiftService } from './gift.service';
import { RequestWithUser } from '../../shared/types';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { prisma } from '../../config/database';

export class GiftController {
  private giftService: GiftService;

  constructor() {
    this.giftService = new GiftService();
  }

  /**
   * GET /api/v1/gifts/recipient/:userId/eligibility
   * Validar si un usuario puede recibir regalos
   */
  validateRecipientEligibility = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const requestWithUser = req as RequestWithUser;
      const senderId = requestWithUser.user?.id; // Opcional: si el usuario está autenticado, validar permisos

      if (!userId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'userId es requerido'));
      }

      const eligibility = await this.giftService.validateGiftRecipient(userId, senderId);

      res.status(200).json(successResponse(eligibility));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/gifts/validate-recipient?recipientId=...&senderId=...
   * Validar elegibilidad usando query params (para uso en checkout)
   */
  validateRecipient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipientId, senderId } = req.query;
      const requestWithUser = req as RequestWithUser;
      
      // Usar senderId del query o del usuario autenticado
      const finalSenderId = (senderId as string) || requestWithUser.user?.id;

      if (!recipientId || typeof recipientId !== 'string') {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'recipientId es requerido'));
      }

      const eligibility = await this.giftService.validateGiftRecipient(recipientId, finalSenderId);

      res.status(200).json(successResponse(eligibility));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/gifts/orders?type=sent|received
   * Obtener regalos enviados o recibidos con filtros de privacidad
   */
  getGiftOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const userId = requestWithUser.user.id;
      const type = req.query.type as 'sent' | 'received' | undefined;

      if (!type || (type !== 'sent' && type !== 'received')) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'type debe ser "sent" o "received"'));
      }

      let orders;

      if (type === 'sent') {
        // Regalos que he enviado
        orders = await prisma.order.findMany({
          where: {
            isGiftOrder: true,
            giftSenderId: userId,
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    handle: true,
                    images: true,
                  },
                },
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    title: true,
                    // NO incluir price - privacidad para el remitente
                  },
                },
              },
            },
            orderAddresses: {
              include: {
                address: {
                  // NO incluir dirección completa - privacidad
                  select: {
                    id: true,
                    city: true,
                    state: true,
                    country: true,
                    // NO incluir address1, firstName, lastName, phone, postalCode
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      } else {
        // Regalos que he recibido - solo mostrar los pagados
        orders = await prisma.order.findMany({
          where: {
            isGiftOrder: true,
            giftRecipientId: userId,
            paymentStatus: 'paid', // ✅ Solo mostrar regalos pagados
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    handle: true,
                    images: true,
                  },
                },
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    title: true,
                    // NO incluir price - privacidad para el destinatario
                  },
                },
              },
            },
            orderAddresses: {
              include: {
                address: {
                  select: {
                    id: true,
                    city: true,
                    state: true,
                    country: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      }

      // Obtener información de los otros usuarios (destinatarios o remitentes)
      const otherUserIds = new Set<string>();
      orders.forEach(order => {
        if (type === 'sent' && order.giftRecipientId) {
          otherUserIds.add(order.giftRecipientId);
        } else if (type === 'received' && order.giftSenderId) {
          otherUserIds.add(order.giftSenderId);
        }
      });

      const otherUsers = otherUserIds.size > 0
        ? await prisma.user.findMany({
            where: {
              id: { in: Array.from(otherUserIds) },
            },
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  avatar: true,
                },
              },
            },
          })
        : [];

      const otherUsersMap = new Map(otherUsers.map(u => [u.id, u]));

      // Formatear respuesta con filtros de privacidad
      const formattedOrders = orders.map((order) => {
        const isSender = type === 'sent';
        
        return {
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          // NO incluir total, subtotal, shippingTotal si es destinatario
          ...(isSender ? {
            total: order.total,
            subtotal: order.subtotal,
            shippingTotal: order.shippingTotal,
          } : {}),
          // Información del otro usuario
          otherUser: isSender
            ? (order.giftRecipientId
                ? {
                    id: order.giftRecipientId,
                    // No mostrar información del destinatario al remitente (privacidad)
                    username: null,
                    firstName: null,
                    lastName: null,
                    avatar: null,
                  }
                : null)
            : (order.giftSenderId
                ? {
                    id: order.giftSenderId,
                    username: otherUsersMap.get(order.giftSenderId)?.username || null,
                    firstName: otherUsersMap.get(order.giftSenderId)?.firstName || null,
                    lastName: otherUsersMap.get(order.giftSenderId)?.lastName || null,
                    avatar: otherUsersMap.get(order.giftSenderId)?.profile?.avatar || null,
                  }
                : null),
          items: order.items.map((item) => ({
            id: item.id,
            product: item.product,
            variant: {
              id: item.variant.id,
              sku: item.variant.sku,
              title: item.variant.title,
              // NO incluir price
            },
            quantity: item.quantity,
            // NO incluir price, finalPrice si es destinatario
            ...(isSender ? {
              price: item.price,
              finalPrice: item.finalPrice,
            } : {}),
            dropiStatus: item.dropiStatus,
            dropiOrderId: item.dropiOrderId,
          })),
          address: order.orderAddresses && order.orderAddresses.length > 0
            ? {
                // Información limitada de dirección
                city: order.orderAddresses[0].address.city,
                state: order.orderAddresses[0].address.state,
                country: order.orderAddresses[0].address.country,
                // NO incluir address1, firstName, lastName, phone, postalCode
              }
            : null,
        };
      });

      res.status(200).json(successResponse({
        orders: formattedOrders,
        count: formattedOrders.length,
      }));
    } catch (error) {
      next(error);
    }
  };
}


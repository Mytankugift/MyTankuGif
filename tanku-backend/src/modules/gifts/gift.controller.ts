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

      const variantId = typeof req.query.variantId === 'string' ? req.query.variantId : undefined;
      const eligibility = await this.giftService.validateGiftRecipient(userId, senderId, variantId);

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

      const variantId = typeof req.query.variantId === 'string' ? req.query.variantId : undefined;
      const eligibility = await this.giftService.validateGiftRecipient(
        recipientId,
        finalSenderId,
        variantId
      );

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
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    address1: true,
                    detail: true,
                    city: true,
                    state: true,
                    postalCode: true,
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
                    firstName: true,
                    lastName: true,
                    phone: true,
                    address1: true,
                    detail: true,
                    city: true,
                    state: true,
                    postalCode: true,
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
        const productAmountFromItems = order.items.reduce(
          (sum, item) => sum + (item.finalPrice ?? item.price) * item.quantity,
          0
        );
        const giftProductAmount =
          productAmountFromItems > 0 ? productAmountFromItems : order.subtotal;

        return {
          id: order.id,
          ref: order.ref ?? null,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          // Precio regalo = producto (envío incluido en tankuPrice; no exponer shippingTotal)
          ...(isSender
            ? {
                total: giftProductAmount,
                subtotal: giftProductAmount,
              }
            : {}),
          // Información del otro usuario
          otherUser: isSender
            ? (order.giftRecipientId
                ? {
                    id: order.giftRecipientId,
                    // Mostrar información del destinatario al remitente
                    username: otherUsersMap.get(order.giftRecipientId)?.username || null,
                    firstName: otherUsersMap.get(order.giftRecipientId)?.firstName || null,
                    lastName: otherUsersMap.get(order.giftRecipientId)?.lastName || null,
                    avatar: otherUsersMap.get(order.giftRecipientId)?.profile?.avatar || null,
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
            dropiWebhookData: item.dropiWebhookData,
          })),
          address: order.orderAddresses && order.orderAddresses.length > 0
            ? (() => {
                const addr = order.orderAddresses[0].address;
                if (isSender) {
                  return {
                    city: addr.city,
                    state: addr.state,
                    country: addr.country,
                  };
                }
                return {
                  firstName: addr.firstName,
                  lastName: addr.lastName,
                  phone: addr.phone,
                  address1: addr.address1,
                  address2: addr.detail,
                  city: addr.city,
                  state: addr.state,
                  postalCode: addr.postalCode,
                  country: addr.country,
                };
              })()
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


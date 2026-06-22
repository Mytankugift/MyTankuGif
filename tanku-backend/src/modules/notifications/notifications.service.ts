/**
 * Notifications Service
 * 
 * Servicio para gestionar notificaciones de usuarios
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import {
  NotificationDTO,
  NotificationCountDTO,
  CreateNotificationDTO,
} from '../../shared/dto/notifications.dto';
import { getSocketService } from '../../shared/realtime/socket.service';
import {
  computePostInteractionCopy,
  resolveActorName,
  buildCommentLikeCopy,
  formatCommentPreviewResolved,
} from './post-notification-copy';

export class NotificationsService {
  /**
   * Mapear Notification a NotificationDTO
   */
  private mapNotificationToDTO(notification: any): NotificationDTO {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
    };
  }

  /**
   * Crear notificación
   */
  async createNotification(data: CreateNotificationDTO): Promise<NotificationDTO> {
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Crear notificación
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || null,
        isRead: false,
      },
    });

    const notificationDTO = this.mapNotificationToDTO(notification);

    // Emitir en tiempo real si el usuario está conectado
    const socketService = getSocketService();
    if (socketService.isUserConnected(data.userId)) {
      await socketService.emitNotification(data.userId, notificationDTO);

      // Actualizar contador
      const unreadCount = await this.getUnreadCount(data.userId);
      await socketService.emitNotificationCount(data.userId, unreadCount.unreadCount);
    }

    return notificationDTO;
  }

  /**
   * Elimina notificaciones de solicitud de amistad del destinatario
   * (al aceptar, rechazar o cancelar la solicitud).
   */
  async removeFriendRequestNotifications(
    recipientUserId: string,
    criteria: { friendRequestId?: string; fromUserId?: string }
  ): Promise<void> {
    const orFilters: Array<{
      data: { path: string[]; equals: string };
    }> = [];

    if (criteria.friendRequestId) {
      orFilters.push({
        data: { path: ['friendRequestId'], equals: criteria.friendRequestId },
      });
    }
    if (criteria.fromUserId) {
      orFilters.push({
        data: { path: ['fromUserId'], equals: criteria.fromUserId },
      });
    }
    if (orFilters.length === 0) return;

    const rows = await prisma.notification.findMany({
      where: {
        userId: recipientUserId,
        type: 'friend_request',
        OR: orFilters,
      },
      select: { id: true },
    });

    if (rows.length === 0) return;

    await prisma.notification.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });

    const socketService = getSocketService();
    if (socketService.isUserConnected(recipientUserId)) {
      for (const { id } of rows) {
        await socketService.emitNotificationDeleted(recipientUserId, id);
      }
      const unreadCount = await this.getUnreadCount(recipientUserId);
      await socketService.emitNotificationCount(recipientUserId, unreadCount.unreadCount);
    }
  }

  /**
   * Borra solicitudes de amistad ya resueltas (aceptadas/rechazadas) que quedaron en el listado.
   */
  async pruneStaleFriendRequestNotifications(userId: string): Promise<void> {
    const rows = await prisma.notification.findMany({
      where: { userId, type: 'friend_request' },
      select: { id: true, data: true },
    });

    if (rows.length === 0) return;

    const toDelete: string[] = [];

    for (const row of rows) {
      const data = row.data as Record<string, unknown> | null;
      const fromUserId =
        typeof data?.fromUserId === 'string' ? data.fromUserId : null;
      const friendRequestId =
        typeof data?.friendRequestId === 'string' ? data.friendRequestId : null;

      let shouldDelete = false;

      if (friendRequestId) {
        const friend = await prisma.friend.findUnique({
          where: { id: friendRequestId },
          select: { status: true },
        });
        if (!friend || friend.status !== 'pending') {
          shouldDelete = true;
        }
      } else if (fromUserId) {
        const accepted = await prisma.friend.findFirst({
          where: {
            status: 'accepted',
            OR: [
              { userId, friendId: fromUserId },
              { userId: fromUserId, friendId: userId },
            ],
          },
          select: { id: true },
        });
        if (accepted) shouldDelete = true;
      }

      if (shouldDelete) toDelete.push(row.id);
    }

    if (toDelete.length === 0) return;

    await prisma.notification.deleteMany({ where: { id: { in: toDelete } } });

    const socketService = getSocketService();
    if (socketService.isUserConnected(userId)) {
      for (const id of toDelete) {
        await socketService.emitNotificationDeleted(userId, id);
      }
      const unreadCount = await this.getUnreadCount(userId);
      await socketService.emitNotificationCount(userId, unreadCount.unreadCount);
    }
  }

  /**
   * Sincroniza la notificación-grupo de interacción masiva sobre una publicación
   * (post_like / post_comment). Recalcula los actores desde la BD (fuente de verdad),
   * hace upsert/borrado de una única fila por (userId, groupKey) y emite por socket.
   *
   * @param ownerId   dueño de la publicación (destinatario de la notificación)
   * @param posterId  id de la publicación
   * @param kind      'post_like' | 'post_comment'
   * @param bump      true en interacción aditiva (like/comentario nuevo): sube al tope
   *                  y marca como no leída. false en reconciliación (unlike): solo
   *                  actualiza el copy/contador sin marcar no leído ni reordenar.
   */
  async syncPostInteractionNotification(params: {
    ownerId: string;
    posterId: string;
    kind: 'post_like' | 'post_comment';
    bump?: boolean;
  }): Promise<void> {
    const { ownerId, posterId, kind } = params;
    const bump = params.bump ?? true;
    const groupKey = `${kind}:${posterId}`;

    try {
      // Recalcular actores (distintos del dueño) desde la fuente de verdad
      const actorSelect = {
        customerId: true,
        customer: { select: { firstName: true, lastName: true, email: true } },
      };

      const rows =
        kind === 'post_like'
          ? await prisma.posterReaction.findMany({
              where: { posterId, customerId: { not: ownerId } },
              distinct: ['customerId'],
              orderBy: { createdAt: 'desc' },
              select: actorSelect,
            })
          : await prisma.posterComment.findMany({
              where: { posterId, customerId: { not: ownerId }, isActive: true },
              distinct: ['customerId'],
              orderBy: { createdAt: 'desc' },
              select: actorSelect,
            });

      const count = rows.length;
      const socketService = getSocketService();

      // Sin actores -> borrar el grupo (caso unlike que deja la publicación en 0)
      if (count === 0) {
        const existing = await prisma.notification.findUnique({
          where: { userId_groupKey: { userId: ownerId, groupKey } },
          select: { id: true, isRead: true },
        });
        if (existing) {
          await prisma.notification.delete({ where: { id: existing.id } });
          if (socketService.isUserConnected(ownerId)) {
            await socketService.emitNotificationDeleted(ownerId, existing.id);
            const unreadCount = await this.getUnreadCount(ownerId);
            await socketService.emitNotificationCount(ownerId, unreadCount.unreadCount);
          }
        }
        return;
      }

      const names = rows.slice(0, 3).map((r) => resolveActorName(r.customer));
      const lastActor = rows[0];
      const { title, message } = await computePostInteractionCopy(prisma, {
        ownerId,
        posterId,
        kind,
        names,
        count,
      });
      const data = {
        posterId,
        type: kind,
        actorId: lastActor.customerId,
        actorName: names[0],
        count,
      };

      const notification = await prisma.notification.upsert({
        where: { userId_groupKey: { userId: ownerId, groupKey } },
        create: {
          userId: ownerId,
          type: kind,
          title,
          message,
          data,
          groupKey,
          isRead: false,
        },
        update: bump
          ? {
              title,
              message,
              data,
              isRead: false,
              readAt: null,
              createdAt: new Date(),
            }
          : {
              title,
              message,
              data,
            },
      });

      if (socketService.isUserConnected(ownerId)) {
        await socketService.emitNotification(ownerId, this.mapNotificationToDTO(notification));
        const unreadCount = await this.getUnreadCount(ownerId);
        await socketService.emitNotificationCount(ownerId, unreadCount.unreadCount);
      }
    } catch (error: any) {
      // Nunca romper el flujo de like/comentario por un fallo de notificación
      console.error('Error sincronizando notificación agrupada:', error?.message);
    }
  }

  /**
   * Notificación agrupada y sutil cuando un comentario recibe likes.
   * Una fila por comentario; el título refleja el contador actual.
   */
  async syncCommentLikeNotification(params: {
    ownerId: string;
    posterId: string;
    commentId: string;
    likesCount: number;
    commentContent: string;
    mentions?: unknown;
    bump?: boolean;
  }): Promise<void> {
    const { ownerId, posterId, commentId, likesCount, commentContent, mentions } = params;
    const bump = params.bump ?? true;
    const groupKey = `comment_like:${commentId}`;

    try {
      const socketService = getSocketService();

      if (likesCount <= 0) {
        const existing = await prisma.notification.findUnique({
          where: { userId_groupKey: { userId: ownerId, groupKey } },
          select: { id: true },
        });
        if (existing) {
          await prisma.notification.delete({ where: { id: existing.id } });
          if (socketService.isUserConnected(ownerId)) {
            await socketService.emitNotificationDeleted(ownerId, existing.id);
            const unreadCount = await this.getUnreadCount(ownerId);
            await socketService.emitNotificationCount(ownerId, unreadCount.unreadCount);
          }
        }
        return;
      }

      let mentionsArray: string[] | undefined;
      if (mentions) {
        try {
          if (Array.isArray(mentions)) {
            mentionsArray = mentions as string[];
          } else if (typeof mentions === 'string') {
            mentionsArray = JSON.parse(mentions);
          }
        } catch {
          mentionsArray = undefined;
        }
      }

      const preview = await formatCommentPreviewResolved(
        prisma,
        commentContent,
        mentionsArray,
        80
      );
      const { title, message } = buildCommentLikeCopy(likesCount, preview);
      const data = {
        posterId,
        commentId,
        count: likesCount,
        type: 'comment_like',
      };

      const notification = await prisma.notification.upsert({
        where: { userId_groupKey: { userId: ownerId, groupKey } },
        create: {
          userId: ownerId,
          type: 'comment_like',
          title,
          message,
          data,
          groupKey,
          isRead: false,
        },
        update: bump
          ? {
              title,
              message,
              data,
              isRead: false,
              readAt: null,
              createdAt: new Date(),
            }
          : {
              title,
              message,
              data,
            },
      });

      if (socketService.isUserConnected(ownerId)) {
        await socketService.emitNotification(ownerId, this.mapNotificationToDTO(notification));
        const unreadCount = await this.getUnreadCount(ownerId);
        await socketService.emitNotificationCount(ownerId, unreadCount.unreadCount);
      }
    } catch (error: any) {
      console.error('Error sincronizando notificación de like en comentario:', error?.message);
    }
  }

  /**
   * Una fila por persona que te aceptó (groupKey = friend_accepted:{acceptedByUserId}).
   * Re-aceptar actualiza la misma notificación en lugar de duplicar.
   */
  async syncFriendAcceptedNotification(params: {
    recipientUserId: string;
    acceptedByUserId: string;
    title: string;
    message: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { recipientUserId, acceptedByUserId, title, message, data } = params;
    const groupKey = `friend_accepted:${acceptedByUserId}`;

    try {
      const socketService = getSocketService();

      const sameActorRows = await prisma.notification.findMany({
        where: {
          userId: recipientUserId,
          type: 'friend_accepted',
        },
        select: { id: true, groupKey: true, data: true },
      });

      const duplicateIds = sameActorRows
        .filter((row) => {
          if (row.groupKey === groupKey) return false;
          const rowData = row.data as Record<string, unknown> | null;
          return (
            rowData?.friendId === acceptedByUserId ||
            rowData?.actorId === acceptedByUserId
          );
        })
        .map((row) => row.id);

      if (duplicateIds.length > 0) {
        await prisma.notification.deleteMany({
          where: { id: { in: duplicateIds } },
        });
        if (socketService.isUserConnected(recipientUserId)) {
          for (const id of duplicateIds) {
            await socketService.emitNotificationDeleted(recipientUserId, id);
          }
        }
      }

      const notification = await prisma.notification.upsert({
        where: { userId_groupKey: { userId: recipientUserId, groupKey } },
        create: {
          userId: recipientUserId,
          type: 'friend_accepted',
          title,
          message,
          data: data as object,
          groupKey,
          isRead: false,
        },
        update: {
          type: 'friend_accepted',
          title,
          message,
          data: data as object,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        },
      });

      if (socketService.isUserConnected(recipientUserId)) {
        await socketService.emitNotification(
          recipientUserId,
          this.mapNotificationToDTO(notification)
        );
        const unreadCount = await this.getUnreadCount(recipientUserId);
        await socketService.emitNotificationCount(
          recipientUserId,
          unreadCount.unreadCount
        );
      }
    } catch (error: any) {
      console.error('Error sincronizando notificación de amistad aceptada:', error?.message);
    }
  }

  /**
   * Elimina notificaciones friend_accepted entre dos usuarios (al quitar la amistad).
   */
  async removeFriendAcceptedBetweenUsers(
    userA: string,
    userB: string
  ): Promise<void> {
    const pairs: Array<[string, string]> = [
      [userA, userB],
      [userB, userA],
    ];

    const socketService = getSocketService();

    for (const [recipientId, otherUserId] of pairs) {
      const groupKey = `friend_accepted:${otherUserId}`;
      const rows = await prisma.notification.findMany({
        where: {
          userId: recipientId,
          type: 'friend_accepted',
          OR: [
            { groupKey },
            { data: { path: ['friendId'], equals: otherUserId } },
            { data: { path: ['actorId'], equals: otherUserId } },
          ],
        },
        select: { id: true },
      });

      if (rows.length === 0) continue;

      await prisma.notification.deleteMany({
        where: { id: { in: rows.map((r) => r.id) } },
      });

      if (socketService.isUserConnected(recipientId)) {
        for (const { id } of rows) {
          await socketService.emitNotificationDeleted(recipientId, id);
        }
        const unreadCount = await this.getUnreadCount(recipientId);
        await socketService.emitNotificationCount(recipientId, unreadCount.unreadCount);
      }
    }
  }

  /**
   * Sincroniza la notificación de actualización de pedido (una fila por orden).
   * Cada nuevo estado reemplaza la anterior, sube al tope y marca como no leída.
   */
  async syncOrderUpdateNotification(params: {
    userId: string;
    type: 'order_update' | 'stalkergift_order_update';
    orderId: string;
    title: string;
    message: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { userId, type, orderId, title, message, data } = params;
    const groupKey = `${type}:${orderId}`;

    try {
      const socketService = getSocketService();

      const notification = await prisma.notification.upsert({
        where: { userId_groupKey: { userId, groupKey } },
        create: {
          userId,
          type,
          title,
          message,
          data: data as any,
          groupKey,
          isRead: false,
        },
        update: {
          type,
          title,
          message,
          data: data as any,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        },
      });

      if (socketService.isUserConnected(userId)) {
        await socketService.emitNotification(userId, this.mapNotificationToDTO(notification));
        const unreadCount = await this.getUnreadCount(userId);
        await socketService.emitNotificationCount(userId, unreadCount.unreadCount);
      }
    } catch (error: any) {
      console.error('Error sincronizando notificación de pedido:', error?.message);
    }
  }

  /**
   * Sincroniza la notificación de soporte (una fila por pedido).
   * Agrupa status y respuestas del mismo orderId; limpia filas legacy sin groupKey.
   */
  async syncSupportCaseNotification(params: {
    userId: string;
    type: 'support_case_status' | 'support_case_reply';
    orderId: string;
    title: string;
    message: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { userId, type, orderId, title, message, data } = params;
    const groupKey = `support_order:${orderId}`;

    try {
      const socketService = getSocketService();

      // Filas existentes de soporte para este pedido (incluye legacy sin groupKey)
      const existingRows = await prisma.notification.findMany({
        where: {
          userId,
          type: { in: ['support_case_status', 'support_case_reply'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const sameOrderRows = existingRows.filter((row) => {
        const rowData = row.data as Record<string, unknown> | null;
        return rowData?.orderId === orderId;
      });

      const keeper =
        sameOrderRows.find((r) => r.groupKey === groupKey) ?? sameOrderRows[0];
      const deleteIds = sameOrderRows
        .filter((r) => r.id !== keeper?.id)
        .map((r) => r.id);

      if (deleteIds.length > 0) {
        await prisma.notification.deleteMany({ where: { id: { in: deleteIds } } });
        for (const id of deleteIds) {
          if (socketService.isUserConnected(userId)) {
            await socketService.emitNotificationDeleted(userId, id);
          }
        }
      }

      let notification;
      if (keeper) {
        notification = await prisma.notification.update({
          where: { id: keeper.id },
          data: {
            type,
            title,
            message,
            data: data as any,
            groupKey,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
          },
        });
      } else {
        notification = await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            message,
            data: data as any,
            groupKey,
            isRead: false,
          },
        });
      }

      if (socketService.isUserConnected(userId)) {
        await socketService.emitNotification(userId, this.mapNotificationToDTO(notification));
        const unreadCount = await this.getUnreadCount(userId);
        await socketService.emitNotificationCount(userId, unreadCount.unreadCount);
      }
    } catch (error: any) {
      console.error('Error sincronizando notificación de soporte:', error?.message);
    }
  }

  /**
   * Obtener notificaciones del usuario
   * Orden: primero no leídas, luego leídas (ambas por fecha descendente)
   */
  async getNotifications(
    userId: string,
    filters?: { isRead?: boolean; limit?: number; offset?: number }
  ): Promise<NotificationDTO[]> {
    await this.pruneStaleFriendRequestNotifications(userId);

    const where: any = { userId };

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [
        { isRead: 'asc' }, // false (no leídas) primero, luego true (leídas)
        { createdAt: 'desc' }, // Más recientes primero
      ],
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return notifications.map((n) => this.mapNotificationToDTO(n));
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<NotificationCountDTO> {
    const [unreadCount, totalCount] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      unreadCount,
      totalCount,
    };
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationDTO> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notificación no encontrada');
    }

    if (notification.userId !== userId) {
      throw new BadRequestError('No tienes permiso para marcar esta notificación');
    }

    if (notification.isRead) {
      // Ya está leída, retornar sin cambios
      return this.mapNotificationToDTO(notification);
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const notificationDTO = this.mapNotificationToDTO(updated);

    // Actualizar contador en tiempo real
    const socketService = getSocketService();
    if (socketService.isUserConnected(userId)) {
      const unreadCount = await this.getUnreadCount(userId);
      await socketService.emitNotificationCount(userId, unreadCount.unreadCount);
    }

    return notificationDTO;
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Actualizar contador en tiempo real
    const socketService = getSocketService();
    if (socketService.isUserConnected(userId)) {
      const unreadCount = await this.getUnreadCount(userId);
      await socketService.emitNotificationCount(userId, unreadCount.unreadCount);
    }

    return { count: result.count };
  }

  /**
   * Eliminar notificación
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notificación no encontrada');
    }

    if (notification.userId !== userId) {
      throw new BadRequestError('No tienes permiso para eliminar esta notificación');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    // Actualizar contador en tiempo real
    const socketService = getSocketService();
    if (socketService.isUserConnected(userId)) {
      const unreadCount = await this.getUnreadCount(userId);
      await socketService.emitNotificationCount(userId, unreadCount.unreadCount);
    }
  }

  /**
   * Crear notificación de regalo recibido
   * 
   * @param recipientId - ID del usuario que recibió el regalo
   * @param orderId - ID de la orden de regalo
   * @param senderId - ID del usuario que envió el regalo (opcional, puede ser anónimo)
   */
  async createGiftNotification(
    recipientId: string,
    orderId: string,
    senderId?: string
  ): Promise<NotificationDTO> {
    return this.createNotification({
      userId: recipientId,
      type: 'gift_received',
      title: '¡Te han enviado un regalo! 🎁',
      message: 'Alguien te ha enviado un regalo. Revisa tu perfil para ver los detalles.',
      data: {
        orderId,
        senderId: senderId || null,
        type: 'gift',
      },
    });
  }
}

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
   * Obtener notificaciones del usuario
   * Orden: primero no leídas, luego leídas (ambas por fecha descendente)
   */
  async getNotifications(
    userId: string,
    filters?: { isRead?: boolean; limit?: number; offset?: number }
  ): Promise<NotificationDTO[]> {
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

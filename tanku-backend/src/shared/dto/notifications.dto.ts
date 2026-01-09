/**
 * DTOs para módulo de notificaciones
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type NotificationCountDTO = {
  unreadCount: number;
  totalCount: number;
};

export type CreateNotificationDTO = {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
};


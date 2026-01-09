/**
 * Notifications Controller
 * 
 * Controller para gestionar notificaciones de usuarios
 */

import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { RequestWithUser } from '../../shared/types';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';

export class NotificationsController {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  /**
   * GET /api/v1/notifications
   * Obtener notificaciones del usuario
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const notifications = await this.notificationsService.getNotifications(
        requestWithUser.user.id,
        { isRead, limit, offset }
      );

      res.status(200).json(successResponse(notifications));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/notifications/unread-count
   * Obtener contador de notificaciones no leídas
   */
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const count = await this.notificationsService.getUnreadCount(requestWithUser.user.id);

      res.status(200).json(successResponse(count));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/notifications/:id/read
   * Marcar notificación como leída
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;

      const notification = await this.notificationsService.markAsRead(
        id,
        requestWithUser.user.id
      );

      res.status(200).json(successResponse(notification));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/notifications/read-all
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const result = await this.notificationsService.markAllAsRead(requestWithUser.user.id);

      res.status(200).json(successResponse(result));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/notifications/:id
   * Eliminar notificación
   */
  deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;

      await this.notificationsService.deleteNotification(id, requestWithUser.user.id);

      res.status(200).json(successResponse({ message: 'Notificación eliminada exitosamente' }));
    } catch (error: any) {
      next(error);
    }
  };
}

/**
 * Notifications Routes
 * 
 * Rutas para el módulo de notificaciones
 */

import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const notificationsController = new NotificationsController();

// Obtener notificaciones del usuario
router.get('/', authenticate, notificationsController.getNotifications);

// Obtener contador de no leídas
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);

// Marcar notificación como leída
router.put('/:id/read', authenticate, notificationsController.markAsRead);

// Marcar todas como leídas
router.put('/read-all', authenticate, notificationsController.markAllAsRead);

// Eliminar notificación
router.delete('/:id', authenticate, notificationsController.deleteNotification);

export default router;


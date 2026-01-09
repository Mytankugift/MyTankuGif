/**
 * Notifications Socket Handler
 * 
 * Handler de Socket.IO para notificaciones
 * Las notificaciones se emiten automáticamente desde NotificationsService
 * usando los métodos helper de SocketService
 */

import { SocketService } from '../../shared/realtime/socket.service';

/**
 * Registrar handlers de Socket.IO para notificaciones
 * 
 * Nota: La mayoría de la lógica está en NotificationsService que llama
 * a socketService.emitNotification() y socketService.emitNotificationCount()
 * cuando se crean o actualizan notificaciones.
 * 
 * Este handler está aquí por si se necesita lógica adicional de Socket.IO
 * específica para notificaciones en el futuro.
 */
export function registerNotificationsHandlers(socketService: SocketService) {
  const io = socketService.getIO();
  if (!io) return;

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;

    if (!userId) return;

    // El usuario ya está en la room `user:${userId}` (configurado en socket.service.ts)
    // Las notificaciones se emiten automáticamente a esta room desde NotificationsService

    // Si se necesita lógica adicional de Socket.IO para notificaciones,
    // se puede agregar aquí en el futuro
  });
}


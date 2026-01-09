import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { SocketEvent, SocketUser, SocketEventType } from './socket.types';
import { AuthService } from '../../modules/auth/auth.service';
import { env } from '../../config/env';

const authService = new AuthService();

/**
 * Servicio genérico de Socket.IO
 * 
 * Este servicio proporciona infraestructura de realtime sin lógica de negocio.
 * Está diseñado para ser extensible para:
 * - Notificaciones
 * - Chat
 * - Presencia de usuarios
 * - Cualquier feature que requiera realtime
 * 
 * NO contiene lógica de:
 * - Amigos
 * - Grupos
 * - Chat específico
 * 
 * Los eventos son genéricos: { type, payload }
 */
export class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map(); // userId -> SocketUser
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId

  /**
   * Inicializar Socket.IO server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGINS?.split(',') || ['http://localhost:8000', 'http://localhost:9000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    this.setupMiddleware();
    this.setupConnectionHandlers();

    console.log('✅ [SOCKET] Socket.IO inicializado');
    return this.io;
  }

  /**
   * Middleware de autenticación para Socket.IO
   */
  private setupMiddleware() {
    if (!this.io) return;

    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Token no proporcionado'));
        }

        // Verificar token JWT
        const decoded = authService.verifyToken(token);
        
        // Agregar userId al socket para uso posterior
        (socket as any).userId = decoded.userId;
        next();
      } catch (error: any) {
        console.error('❌ [SOCKET] Error de autenticación:', error.message);
        next(new Error('Autenticación fallida'));
      }
    });
  }

  /**
   * Handlers de conexión genéricos
   */
  private setupConnectionHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;

      if (!userId) {
        console.error('❌ [SOCKET] Conexión sin userId');
        socket.disconnect();
        return;
      }

      // Registrar usuario conectado
      const user: SocketUser = {
        userId,
        socketId: socket.id,
        connectedAt: new Date(),
      };

      this.connectedUsers.set(userId, user);
      this.socketToUser.set(socket.id, userId);

      console.log(`✅ [SOCKET] Usuario conectado: ${userId} (socket: ${socket.id})`);

      // Unirse a room personal del usuario (para notificaciones directas)
      socket.join(`user:${userId}`);

      // Handler genérico de eventos
      socket.on('event', (event: SocketEvent) => {
        this.handleGenericEvent(socket, event);
      });

      // Handler de desconexión
      socket.on('disconnect', () => {
        this.handleDisconnection(socket, userId);
      });

      // Emitir evento de conexión al usuario
      this.emitToUser(userId, {
        type: 'presence',
        payload: { status: 'connected', socketId: socket.id },
        timestamp: new Date().toISOString(),
      });
    });

    // Registrar handlers de módulos específicos
    this.registerModuleHandlers();
  }

  /**
   * Registrar handlers de módulos específicos
   */
  private registerModuleHandlers() {
    // Notificaciones
    try {
      const { registerNotificationsHandlers } = require('../../modules/notifications/notifications-socket.handler');
      registerNotificationsHandlers(this);
    } catch (error) {
      // Módulo no disponible aún, ignorar
    }
  }

  /**
   * Handler genérico de eventos
   * Los eventos deben seguir el formato: { type, payload }
   */
  private handleGenericEvent(socket: Socket, event: SocketEvent) {
    const userId = (socket as any).userId;

    console.log(`📨 [SOCKET] Evento recibido de ${userId}:`, event.type);

    // El handler es genérico - no contiene lógica de negocio
    // Las features futuras (chat, notificaciones) implementarán sus propios handlers
    // que se registrarán aquí cuando se implementen

    // Por ahora, solo logueamos el evento
    // TODO: Cuando se implementen features, registrar handlers específicos aquí
  }

  /**
   * Handler de desconexión
   */
  private handleDisconnection(socket: Socket, userId: string) {
    this.connectedUsers.delete(userId);
    this.socketToUser.delete(socket.id);

    console.log(`❌ [SOCKET] Usuario desconectado: ${userId} (socket: ${socket.id})`);

    // Emitir evento de desconexión (si hay otros sockets del mismo usuario, no emitir)
    if (!this.isUserConnected(userId)) {
      // Usuario completamente desconectado
      // TODO: Cuando se implemente presencia, notificar a amigos aquí
    }
  }

  /**
   * Emitir evento a un usuario específico
   */
  emitToUser(userId: string, event: SocketEvent) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('event', {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      userId: event.userId || userId,
    });
  }

  /**
   * Emitir evento a múltiples usuarios
   */
  emitToUsers(userIds: string[], event: SocketEvent) {
    userIds.forEach((userId) => this.emitToUser(userId, event));
  }

  /**
   * Emitir evento a una room específica
   */
  emitToRoom(roomId: string, event: SocketEvent) {
    if (!this.io) return;

    this.io.to(roomId).emit('event', {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Unir un usuario a una room
   */
  joinRoom(userId: string, roomId: string) {
    if (!this.io) return;

    const user = this.connectedUsers.get(userId);
    if (!user) return;

    const socket = this.io.sockets.sockets.get(user.socketId);
    if (socket) {
      socket.join(roomId);
      console.log(`✅ [SOCKET] Usuario ${userId} unido a room: ${roomId}`);
    }
  }

  /**
   * Sacar un usuario de una room
   */
  leaveRoom(userId: string, roomId: string) {
    if (!this.io) return;

    const user = this.connectedUsers.get(userId);
    if (!user) return;

    const socket = this.io.sockets.sockets.get(user.socketId);
    if (socket) {
      socket.leave(roomId);
      console.log(`✅ [SOCKET] Usuario ${userId} salió de room: ${roomId}`);
    }
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Obtener información de un usuario conectado
   */
  getConnectedUser(userId: string): SocketUser | undefined {
    return this.connectedUsers.get(userId);
  }

  /**
   * Obtener todos los usuarios conectados
   */
  getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Obtener instancia de Socket.IO (para uso avanzado)
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Emitir notificación en tiempo real
   * Helper para el módulo de notificaciones
   */
  async emitNotification(userId: string, notification: any) {
    this.emitToUser(userId, {
      type: 'notification',
      payload: {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emitir contador de notificaciones no leídas
   */
  async emitNotificationCount(userId: string, unreadCount: number) {
    this.emitToUser(userId, {
      type: 'notification_count',
      payload: {
        unreadCount: unreadCount,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton
let socketServiceInstance: SocketService | null = null;

export function getSocketService(): SocketService {
  if (!socketServiceInstance) {
    socketServiceInstance = new SocketService();
  }
  return socketServiceInstance;
}


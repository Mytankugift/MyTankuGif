import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { SocketEvent, SocketUser, SocketEventType } from './socket.types';
import { AuthService } from '../../modules/auth/auth.service';
import { ChatService } from '../../modules/chat/chat.service';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

const authService = new AuthService();
const chatService = new ChatService();

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
      socket.on('disconnect', (reason: string) => {
        console.log(`⚠️ [SOCKET] Usuario ${userId} desconectado: ${reason}`);
        this.handleDisconnection(socket, userId);
      });

      // Handler de reconexión (Socket.IO automático)
      socket.on('reconnect', (attemptNumber: number) => {
        console.log(`🔄 [SOCKET] Usuario ${userId} reconectado después de ${attemptNumber} intentos`);
        // Re-unir a todas las conversaciones activas
        this.joinUserConversations(userId, socket);
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

    // Chat
    this.registerChatHandlers();
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
    if (!this.io) {
      console.warn(`⚠️ [SOCKET] No se puede emitir a usuario ${userId}: Socket.IO no inicializado`);
      return;
    }

    const user = this.connectedUsers.get(userId);
    if (!user) {
      console.warn(`⚠️ [SOCKET] Usuario ${userId} no está conectado, no se puede emitir evento`);
      return;
    }

    console.log(`📤 [SOCKET] Emitiendo evento '${event.type}' a usuario ${userId} (socket: ${user.socketId})`);
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

  /**
   * Registrar handlers de chat
   */
  private registerChatHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;
      if (!userId) return;

      // Unirse a conversaciones del usuario al conectar
      this.joinUserConversations(userId, socket);

      // Handler: Unirse a una conversación específica
      socket.on('chat:join', async (conversationId: string) => {
        try {
          // Validar acceso directamente con Prisma
          const participant = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId,
              userId,
            },
          });

          if (!participant) {
            throw new Error('No tienes acceso a esta conversación');
          }
          
          // Unirse a la room de la conversación (para recibir mensajes)
          socket.join(`conversation:${conversationId}`);
          
          // También mantener room de usuario (para notificaciones)
          socket.join(`user:${userId}`);
          
          console.log(`✅ [SOCKET-CHAT] Usuario ${userId} unido a conversación ${conversationId}`);
          
          // Notificar al socket que se unió exitosamente
          socket.emit('chat:joined', { conversationId });
        } catch (error: any) {
          console.error(`❌ [SOCKET-CHAT] Error uniendo a conversación:`, error.message);
          socket.emit('chat:error', { 
            conversationId,
            message: error.message || 'Error al unirse a la conversación' 
          });
        }
      });

      // Handler: Salir de una conversación
      socket.on('chat:leave', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`✅ [SOCKET-CHAT] Usuario ${userId} salió de conversación ${conversationId}`);
      });

      // Handler: Enviar mensaje (SOCKET ES EL CANAL PRINCIPAL)
      socket.on('chat:send', async (data: { 
        conversationId: string; 
        content: string; 
        type?: 'TEXT' | 'IMAGE' | 'FILE';
        tempId?: string; // ID temporal del frontend para ACK
      }, callback?: (response: { success: boolean; messageId?: string; error?: string }) => void) => {
        try {
          if (!data.conversationId || !data.content) {
            throw new Error('conversationId y content son requeridos');
          }

          // Validar acceso a la conversación
          const participant = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId: data.conversationId,
              userId,
            },
          });

          if (!participant) {
            throw new Error('No tienes acceso a esta conversación');
          }

          // Guardar mensaje en BD
          const message = await chatService.sendMessage(
            data.conversationId,
            userId,
            data.content,
            data.type || 'TEXT'
          );

          // ACK al remitente (reemplaza mensaje optimista)
          socket.emit('chat:sent', {
            tempId: data.tempId,
            message: {
              id: message.id,
              conversationId: message.conversationId,
              senderId: message.senderId,
              senderAlias: message.senderAlias,
              content: message.content,
              type: message.type,
              status: message.status,
              createdAt: message.createdAt.toISOString(),
              sender: {
                id: message.sender.id,
                firstName: message.sender.firstName,
                lastName: message.sender.lastName,
                email: message.sender.email,
                profile: message.sender.profile,
              },
            },
          });

          // Callback de confirmación
          if (callback) {
            callback({ success: true, messageId: message.id });
          }

          // ✅ Emitir a otros participantes (excluyendo al remitente)
          // Usar socket.to() para excluir al remitente de la emisión
          socket.to(`conversation:${data.conversationId}`).emit('chat:new', {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderAlias: message.senderAlias,
            content: message.content,
            type: message.type,
            status: message.status,
            createdAt: message.createdAt.toISOString(),
            sender: {
              id: message.sender.id,
              firstName: message.sender.firstName,
              lastName: message.sender.lastName,
              email: message.sender.email,
              profile: message.sender.profile,
            },
          });

          console.log(`✅ [SOCKET-CHAT] Mensaje ${message.id} enviado a conversación ${data.conversationId}`);
        } catch (error: any) {
          console.error(`❌ [SOCKET-CHAT] Error enviando mensaje:`, error.message);
          
          // Error ACK al remitente
          socket.emit('chat:error', {
            tempId: data.tempId,
            conversationId: data.conversationId,
            error: error.message || 'Error al enviar mensaje',
          });

          // Callback de error
          if (callback) {
            callback({ success: false, error: error.message || 'Error al enviar mensaje' });
          }
        }
      });

      // Handler: Indicador de "escribiendo..."
      socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
        // Emitir a todos en la conversación excepto al que está escribiendo
        socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: data.isTyping,
        });
      });

      // Handler: Marcar mensajes como leídos
      socket.on('chat:read', async (data: { conversationId: string }) => {
        try {
          await chatService.markAsRead(data.conversationId, userId);

          // Obtener otros participantes para notificar
          const conversation = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
            include: {
              participants: {
                select: { userId: true },
              },
            },
          });

          const otherParticipants = conversation?.participants
            .filter(p => p.userId !== userId)
            .map(p => p.userId) || [];

          // Emitir a la room de conversación
          this.io!.to(`conversation:${data.conversationId}`).emit('chat:read', {
            conversationId: data.conversationId,
            readBy: userId,
          });

        } catch (error: any) {
          console.error(`❌ [SOCKET-CHAT] Error marcando como leído:`, error.message);
          socket.emit('chat:error', { 
            conversationId: data.conversationId,
            message: error.message || 'Error al marcar como leído' 
          });
        }
      });

      // Handler: Cerrar conversación
      socket.on('chat:close', async (data: { conversationId: string }) => {
        try {
          await chatService.closeConversation(data.conversationId, userId);
          
          // Obtener otros participantes para notificar
          const conversation = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
            include: {
              participants: {
                select: { userId: true },
              },
            },
          });

          const otherParticipants = conversation?.participants
            .filter(p => p.userId !== userId)
            .map(p => p.userId) || [];

          // Emitir a la room de conversación
          this.io!.to(`conversation:${data.conversationId}`).emit('chat:closed', {
            conversationId: data.conversationId,
            closedBy: userId,
          });

          // Salir de la room
          socket.leave(`conversation:${data.conversationId}`);
        } catch (error: any) {
          console.error(`❌ [SOCKET-CHAT] Error cerrando conversación:`, error.message);
          socket.emit('chat:error', { 
            conversationId: data.conversationId,
            message: error.message || 'Error al cerrar la conversación' 
          });
        }
      });
    });
  }

  /**
   * Unir usuario a todas sus conversaciones activas al conectar/reconectar
   */
  private async joinUserConversations(userId: string, socket: Socket) {
    try {
      const conversations = await chatService.getConversations(userId);
      
      conversations.forEach(conversation => {
        socket.join(`conversation:${conversation.id}`);
      });

      // También unirse a room personal del usuario (para notificaciones)
      socket.join(`user:${userId}`);

      if (conversations.length > 0) {
        console.log(`✅ [SOCKET-CHAT] Usuario ${userId} unido a ${conversations.length} conversaciones`);
        
        // Notificar al cliente que se unió a las conversaciones
        socket.emit('chat:conversations:synced', {
          conversationIds: conversations.map(c => c.id),
        });
      }
    } catch (error: any) {
      console.error(`❌ [SOCKET-CHAT] Error uniendo a conversaciones:`, error.message);
    }
  }

  /**
   * Emitir mensaje de chat a una conversación
   */
  emitChatMessage(conversationId: string, message: any) {
    if (!this.io) return;

    this.io.to(`conversation:${conversationId}`).emit('chat:message', {
      type: 'message',
      payload: { message },
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


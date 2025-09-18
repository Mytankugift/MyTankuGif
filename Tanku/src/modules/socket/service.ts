import { MedusaService } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";
import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import SocketConnection from "./models/socket-connection";

class SocketModuleService extends MedusaService({
  SocketConnection,
}) {
  private io: SocketIOServer | null = null;
  private logger: Logger;

  constructor(container, options = {}) {
    super(...arguments);
    this.logger = container.logger;
    
    // Registrar una función de inicialización que puede ser llamada desde fuera del módulo
    this.scheduleInitialization(container);
  }

  /**
   * Programa la inicialización de Socket.IO para cuando el servidor HTTP esté disponible
   */
  private scheduleInitialization(container: any) {
    // Usar setTimeout para intentar la inicialización después de que Medusa esté completamente cargado
    setTimeout(async () => {
      try {
        await this.attemptInitialization(container);
      } catch (error) {
        this.logger.warn("[SOCKET MODULE] Auto-initialization failed, will need manual initialization");
        this.logger.debug(`[SOCKET MODULE] Error details: ${error.message}`);
      }
    }, 5000); // Esperar 5 segundos para que Medusa esté completamente inicializado
  }

  /**
   * Intenta inicializar Socket.IO automáticamente
   */
  private async attemptInitialization(container: any) {
    if (this.io) {
      return; // Ya está inicializado
    }

    try {
      // Intentar obtener el servidor HTTP del contenedor global
      const httpServer = container.resolve?.("httpServer") || 
                        container.cradle?.httpServer ||
                        global.medusaHttpServer;

      if (httpServer) {
        const configModule = container.resolve?.("configModule") || container.cradle?.configModule;
        const corsOrigins = this.parseCorsOrigins(
          configModule?.projectConfig?.http?.storeCors || process.env.STORE_CORS || "*"
        );

        this.initializeSocketServer(httpServer, corsOrigins);
        this.logger.info("[SOCKET MODULE] Auto-initialization successful!");
      } else {
        this.logger.info("[SOCKET MODULE] HTTP server not available for auto-initialization");
      }
    } catch (error) {
      this.logger.debug(`[SOCKET MODULE] Auto-initialization attempt failed: ${error.message}`);
    }
  }

  /**
   * Parsea los CORS origins (función helper)
   */
  private parseCorsOrigins(corsString: string): string[] {
    if (!corsString || corsString === "*") {
      return ["*"];
    }
    return corsString.split(",").map(origin => origin.trim());
  }

  /**
   * Inicializa el servidor Socket.IO
   */
  initializeSocketServer(httpServer: HttpServer, corsOrigins: string | string[]) {
    if (this.io) {
      this.logger.warn("[SOCKET MODULE] Socket.IO server already initialized");
      return this.io;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
    });

    this.setupEventHandlers();
    this.logger.info("[SOCKET MODULE] Socket.IO server initialized successfully");
    
    return this.io;
  }

  /**
   * Configura los manejadores de eventos básicos
   */
  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on("connection", (socket) => {
      this.logger.info(`[SOCKET MODULE] Client connected: ${socket.id}`);

      // Evento de autenticación
      socket.on("authenticate", (data) => {
        try {
          const { customerId } = data;
          if (customerId) {
            socket.join(`user_${customerId}`);
            socket.data.customerId = customerId;
            this.logger.info(`[SOCKET MODULE] User ${customerId} authenticated and joined room`);
            socket.emit("authenticated", { success: true });
          } else {
            socket.emit("authentication_error", { message: "Customer ID required" });
          }
        } catch (error) {
          this.logger.error("[SOCKET MODULE] Authentication error:", error);
          socket.emit("authentication_error", { message: "Authentication failed" });
        }
      });

      // Unirse a una conversación
      socket.on("join-conversation", (data) => {
        try {
          const { conversationId } = data;
          if (conversationId) {
            socket.join(`conversation_${conversationId}`);
            this.logger.info(`[SOCKET MODULE] Socket ${socket.id} joined conversation ${conversationId}`);
            socket.emit("joined-conversation", { conversationId });
          }
        } catch (error) {
          this.logger.error("[SOCKET MODULE] Error joining conversation:", error);
        }
      });

      // Salir de una conversación
      socket.on("leave-conversation", (data) => {
        try {
          const { conversationId } = data;
          if (conversationId) {
            socket.leave(`conversation_${conversationId}`);
            this.logger.info(`[SOCKET MODULE] Socket ${socket.id} left conversation ${conversationId}`);
            socket.emit("left-conversation", { conversationId });
          }
        } catch (error) {
          this.logger.error("[SOCKET MODULE] Error leaving conversation:", error);
        }
      });

      // Indicador de escritura
      socket.on("typing-start", (data) => {
        try {
          const { conversationId } = data;
          if (conversationId && socket.data.customerId) {
            socket.to(`conversation_${conversationId}`).emit("user-typing", {
              customerId: socket.data.customerId,
              conversationId,
              typing: true,
            });
          }
        } catch (error) {
          this.logger.error("[SOCKET MODULE] Error handling typing start:", error);
        }
      });

      socket.on("typing-stop", (data) => {
        try {
          const { conversationId } = data;
          if (conversationId && socket.data.customerId) {
            socket.to(`conversation_${conversationId}`).emit("user-typing", {
              customerId: socket.data.customerId,
              conversationId,
              typing: false,
            });
          }
        } catch (error) {
          this.logger.error("[SOCKET MODULE] Error handling typing stop:", error);
        }
      });

      // Desconexión
      socket.on("disconnect", (reason) => {
        this.logger.info(`[SOCKET MODULE] Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Manejo de errores
      socket.on("error", (error) => {
        this.logger.error(`[SOCKET MODULE] Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Obtiene la instancia del servidor Socket.IO
   */
  getSocketServer(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Emite un evento a un usuario específico
   */
  emitToUser(customerId: string, event: string, data: any) {
    if (!this.io) {
      this.logger.warn("[SOCKET MODULE] Socket.IO server not initialized");
      return;
    }

    this.io.to(`user_${customerId}`).emit(event, data);
    this.logger.debug(`[SOCKET MODULE] Emitted event '${event}' to user ${customerId}`);
  }

  /**
   * Emite un evento a una conversación específica
   */
  emitToConversation(conversationId: string, event: string, data: any) {
    if (!this.io) {
      this.logger.warn("[SOCKET MODULE] Socket.IO server not initialized");
      return;
    }

    this.io.to(`conversation_${conversationId}`).emit(event, data);
    this.logger.debug(`[SOCKET MODULE] Emitted event '${event}' to conversation ${conversationId}`);
  }

  /**
   * Emite un evento a todos los clientes conectados
   */
  emitToAll(event: string, data: any) {
    if (!this.io) {
      this.logger.warn("[SOCKET MODULE] Socket.IO server not initialized");
      return;
    }

    this.io.emit(event, data);
    this.logger.debug(`[SOCKET MODULE] Emitted event '${event}' to all clients`);
  }

  /**
   * Obtiene información sobre las conexiones activas
   */
  async getConnectionInfo() {
    if (!this.io) {
      return { connectedClients: 0, rooms: [] };
    }

    const sockets = await this.io.fetchSockets();
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
    
    return {
      connectedClients: sockets.length,
      rooms: rooms.filter(room => !room.startsWith("user_") && !room.startsWith("conversation_")),
      userRooms: rooms.filter(room => room.startsWith("user_")),
      conversationRooms: rooms.filter(room => room.startsWith("conversation_")),
    };
  }
}

export default SocketModuleService;

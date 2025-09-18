import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCKET_MODULE } from "../../../modules/socket";
import SocketModuleService from "../../../modules/socket/service";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    // Obtener el servicio de Socket del módulo
    const socketService = req.scope.resolve(SOCKET_MODULE) as SocketModuleService;
    
    if (!socketService) {
      res.status(500).json({
        success: false,
        error: "Socket module service not found",
      });
      return;
    }

    // Verificar si ya está inicializado
    const existingServer = socketService.getSocketServer();
    if (existingServer) {
      res.status(200).json({
        success: true,
        message: "Socket.IO server already initialized",
        data: {
          initialized: true,
          alreadyExists: true,
          timestamp: new Date().toISOString(),
          port: process.env.PORT || 9000,
          socketUrl: `${req.protocol}://${req.get('host')}`,
        },
      });
      return;
    }

    // Intentar forzar la inicialización manual
    try {
      // Obtener configuración de CORS
      const configModule = req.scope.resolve("configModule");
      const corsOrigins = configModule?.projectConfig?.http?.storeCors?.split(",") || ["*"];
      
      // Agregar el dominio actual si está en producción
      if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
        const currentHost = `${req.protocol}://${req.get('host')}`;
        if (!corsOrigins.includes(currentHost)) {
          corsOrigins.push(currentHost);
        }
      }

      // Intentar obtener el servidor HTTP de diferentes maneras
      let httpServer = null;
      try {
        httpServer = req.scope.resolve("httpServer");
      } catch (e) {
        // Intentar desde el contenedor global
        try {
          const getHttpServer = req.scope.resolve("getHttpServer") as () => any;
          httpServer = getHttpServer();
        } catch (e2) {
          // Último intento: usar el servidor de la request
          httpServer = (req as any).socket?.server || (req as any).connection?.server;
        }
      }

      if (httpServer) {
        const socketServer = socketService.initializeSocketServer(httpServer as any, corsOrigins);
        
        if (socketServer) {
          res.status(200).json({
            success: true,
            message: "Socket.IO server initialized successfully on same port as Medusa",
            data: {
              initialized: true,
              port: process.env.PORT || 9000,
              socketUrl: `${req.protocol}://${req.get('host')}`,
              timestamp: new Date().toISOString(),
              corsOrigins: corsOrigins,
            },
          });
          return;
        }
      }

      // Si llegamos aquí, no pudimos inicializar
      res.status(500).json({
        success: false,
        error: "Could not access HTTP server for Socket.IO initialization",
        message: "HTTP server not available in current context",
      });

    } catch (initError) {
      res.status(500).json({
        success: false,
        error: "Failed to initialize Socket.IO server",
        message: initError.message,
      });
    }
    
  } catch (error) {
    console.error("[SOCKET INITIALIZE] Error:", error);
    
    res.status(500).json({
      success: false,
      error: "Failed to initialize Socket.IO server",
      message: error.message,
    });
  }
}

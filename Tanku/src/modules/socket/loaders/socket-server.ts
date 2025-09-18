import { LoaderOptions } from "@medusajs/framework/types";
import { asValue } from "awilix";
import SocketModuleService from "../service";

export default async function socketServerLoader({ 
  container
}: LoaderOptions) {
  const logger = container.resolve("logger");
  
  try {
    logger.info("[SOCKET LOADER] Socket.IO module loaded successfully");
    
    // Registrar una función helper para obtener el servidor HTTP cuando esté disponible
    container.register("getHttpServer", asValue(() => {
      try {
        // Intentar diferentes formas de obtener el servidor HTTP
        return container.resolve("httpServer") || 
               container.cradle?.httpServer ||
               global.medusaHttpServer;
      } catch (error) {
        return null;
      }
    }));

    // Programar la inicialización automática después de que Medusa esté completamente cargado
    setTimeout(async () => {
      try {
        const socketService: SocketModuleService = container.resolve("socket");
        if (socketService && typeof socketService.attemptAutoInitialization === 'function') {
          await socketService.attemptAutoInitialization();
        }
      } catch (error) {
        logger.debug(`[SOCKET LOADER] Scheduled initialization failed: ${error.message}`);
      }
    }, 3000);
    
    logger.info("[SOCKET LOADER] Socket.IO will attempt auto-initialization in 3 seconds");
    
  } catch (error) {
    logger.error(`[SOCKET LOADER] Error in socket loader: ${error.message}`);
  }
}

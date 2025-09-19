import { LoaderOptions } from "@medusajs/framework/types";

export default async function socketServerLoader({ 
  container
}: LoaderOptions) {
  const logger = container.resolve("logger");
  
  try {
    logger.info("[SOCKET LOADER] Socket.IO module loaded successfully");
    
    // Programar inicialización después de que el servidor HTTP esté disponible
    setTimeout(async () => {
      try {
        logger.info("[SOCKET LOADER] Attempting to initialize Socket.IO...");
        
        // Hacer una petición HTTP para inicializar Socket.IO
        const http = require('http');
        const options = {
          hostname: 'localhost',
          port: 9000,
          path: '/socket/initialize',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.success) {
                logger.info("[SOCKET LOADER] Socket.IO initialized automatically!");
              } else {
                logger.warn(`[SOCKET LOADER] Failed to auto-initialize Socket.IO: ${response.error}`);
              }
            } catch (error) {
              logger.warn("[SOCKET LOADER] Error parsing initialization response");
            }
          });
        });

        req.on('error', (error) => {
          logger.warn(`[SOCKET LOADER] Could not auto-initialize Socket.IO: ${error.message}`);
          logger.info("[SOCKET LOADER] Socket.IO can be initialized manually via POST /socket/initialize");
        });

        req.end();
        
      } catch (error) {
        logger.warn(`[SOCKET LOADER] Auto-initialization failed: ${error.message}`);
      }
    }, 10000); // Esperar 10 segundos para que Medusa esté completamente inicializado
    
  } catch (error) {
    logger.error(`[SOCKET LOADER] Error in socket loader: ${error.message}`);
  }
}

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

interface ProxyStatus {
  status: 'active' | 'inactive' | 'not_configured' | 'active_with_errors';
  isActive: boolean;
  proxyUrl: string | null;
  httpStatus?: number;
  responseTime?: number;
  message: string;
  timestamp: string;
}

// Cache simple en memoria con TTL de 30 segundos
let cachedStatus: ProxyStatus | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30000; // 30 segundos

export class SystemAdminController {
  /**
   * GET /api/v1/admin/system/proxy/status
   * Verificar estado del proxy con cache (30 segundos TTL)
   * Evita peticiones HTTP constantes y reduce logs
   */
  getProxyStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = Date.now();
      
      // Si el cache es válido, devolverlo directamente (sin logs)
      if (cachedStatus && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return res.status(200).json({
          success: true,
          data: cachedStatus,
          cached: true,
        });
      }

      // Cache expirado o no existe, verificar proxy
      const proxyUrl = env.DROPI_PROXY_URL;
      
      if (!proxyUrl) {
        cachedStatus = {
          status: 'not_configured',
          isActive: false,
          proxyUrl: null,
          message: 'Proxy no configurado (usando DROPI_BASE_URL directamente)',
          timestamp: new Date().toISOString(),
        };
        cacheTimestamp = now;
        return res.status(200).json({
          success: true,
          data: cachedStatus,
        });
      }

      // Intentar hacer una petición simple al proxy para verificar si está activo
      const testUrl = `${proxyUrl}/integrations/categories`;
      const startTime = Date.now();
      
      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'dropi-integration-key': env.DROPI_STATIC_TOKEN,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000), // 5 segundos timeout
        });

        const duration = Date.now() - startTime;
        // ✅ Si el servidor responde (cualquier código HTTP), está activo
        // Solo errores de conexión/timeout indican que está inactivo
        const isActive = true; // Si llegamos aquí, el servidor respondió
        
        // Determinar el estado según el código HTTP
        let status: ProxyStatus['status'] = 'active';
        let statusMessage = `Proxy activo (${response.status})`;
        
        if (response.status >= 500) {
          status = 'active_with_errors';
          statusMessage = `Proxy activo pero con errores upstream (${response.status})`;
        } else if (response.status >= 400 && response.status < 500) {
          status = 'active';
          statusMessage = `Proxy activo (${response.status} - puede ser problema de autenticación o endpoint)`;
        }

        cachedStatus = {
          status,
          isActive,
          proxyUrl,
          httpStatus: response.status,
          responseTime: duration,
          message: statusMessage,
          timestamp: new Date().toISOString(),
        };
        cacheTimestamp = now;
        
        return res.status(200).json({
          success: true,
          data: cachedStatus,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        // Si es timeout o error de conexión, el proxy probablemente está caído
        const isConnectionError = error.name === 'AbortError' || 
                                 error.message?.includes('fetch failed') ||
                                 error.code === 'ECONNREFUSED';

        cachedStatus = {
          status: 'inactive',
          isActive: false,
          proxyUrl,
          responseTime: duration,
          message: isConnectionError 
            ? 'Proxy no responde (posiblemente caído)' 
            : `Error al verificar proxy: ${error.message}`,
          timestamp: new Date().toISOString(),
        };
        cacheTimestamp = now;
        
        return res.status(200).json({
          success: true,
          data: cachedStatus,
        });
      }
    } catch (error: any) {
      console.error('[SYSTEM-ADMIN] Error verificando estado del proxy:', error);
      res.status(500).json({
        success: false,
        error: 'Error al verificar estado del proxy',
        message: error.message,
      });
    }
  };
}


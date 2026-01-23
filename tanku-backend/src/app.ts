import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { env, getCorsOrigins } from './config/env';
import { connectMongoDB, closeConnections } from './config/database';
import { APP_CONSTANTS } from './config/constants';
import { AppError } from './shared/errors/AppError';
import { errorResponse, ErrorCode } from './shared/response';
import { getSocketService } from './shared/realtime/socket.service';

/**
 * Crear aplicación Express
 */
const app = express();

// Logging mínimo - solo en desarrollo
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') {
      console.log(`${req.method} ${req.path}`);
    }
    next();
  });
}

/**
 * Middleware de seguridad
 */
app.use(helmet());

/**
 * CORS
 */
app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Cache-Control', 
      'x-publishable-api-key', 
      'x-feed-cursor',
      'X-Proxy-Key',      // Header del proxy para validación
      'X-Real-IP',         // IP real del cliente
      'X-Forwarded-For',  // IPs del proxy chain
      'X-Forwarded-Proto' // Protocolo original (http/https)
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400, // 24 horas para preflight cache
  })
);

// Manejar OPTIONS explícitamente
app.options('*', (req, res) => {
  res.status(200).end();
});

/**
 * Compresión
 */
app.use(compression());

/**
 * Logging - solo en desarrollo o para errores
 */
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // En producción, solo loggear errores
  app.use((req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    
    res.send = function (body) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      
      // Solo loggear si hay error o es muy lento (>1s)
      if (statusCode >= 400 || duration > 1000) {
        console.log(`${req.method} ${req.path} ${statusCode} ${duration}ms`);
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  });
}

/**
 * Body parsers
 * ✅ IMPORTANTE: urlencoded debe ir ANTES de json para que ePayco funcione
 * ePayco envía datos como application/x-www-form-urlencoded, no JSON
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

/**
 * Manejo de errores de parsing de body
 * Si falla el parsing de JSON pero el body ya fue parseado como urlencoded, continuar
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Type guard para errores de body-parser
  const isBodyParserError = err instanceof SyntaxError && 
                             (err as any).status === 400 && 
                             'body' in err;
  
  if (isBodyParserError) {
    // Error de parsing de JSON - pero el body ya fue parseado por urlencoded si es form-urlencoded
    // Verificar si req.body tiene datos (fue parseado por urlencoded)
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('✅ [BODY-PARSER] Body parseado como urlencoded, ignorando error de JSON');
      return next();
    }
    // Si no hay body parseado, es un error real
    console.error('❌ [BODY-PARSER] Error parseando body:', err.message);
    return res.status(400).json({
      error: 'Error parseando el cuerpo de la petición',
      message: err.message,
    });
  }
  return next(err);
});

/**
 * Health check
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

/**
 * Endpoint de prueba para verificar rutas
 */
app.get('/test-routes', (_req, res) => {
  res.status(200).json({
    message: 'Rutas funcionando',
    routes: {
      categories: '/api/v1/categories',
      products: '/api/v1/products',
      productsByHandle: '/api/v1/products/:handle',
    },
  });
});

/**
 * Endpoint de prueba para webhooks (diagnóstico)
 * Acepta tanto JSON como application/x-www-form-urlencoded
 */
app.post(`${APP_CONSTANTS.API_PREFIX}/webhook/test`, (req, res) => {
  console.log('✅ [WEBHOOK-TEST] Request recibido:', {
    method: req.method,
    path: req.path,
    contentType: req.headers['content-type'],
    headers: req.headers,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString(),
  });
  
  res.status(200).json({ 
    received: true,
    timestamp: new Date().toISOString(),
    message: 'Webhook test funcionando correctamente',
    contentType: req.headers['content-type'],
    body: req.body,
    query: req.query,
  });
});

/**
 * API Routes
 */
import authRoutes from './modules/auth/auth.routes';

app.get(`${APP_CONSTANTS.API_PREFIX}`, (_req, res) => {
  res.json({
    message: 'Tanku API v1',
    version: '1.0.0',
  });
});

// Auth routes - SOLO con prefijo /api/v1
app.use(`${APP_CONSTANTS.API_PREFIX}/auth`, authRoutes);

// Consent routes
import consentRoutes from './modules/consent/consent.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/consent`, consentRoutes);

// Regions routes
import regionsRoutes from './modules/regions/regions.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/regions`, regionsRoutes);

// Wishlists routes
import wishlistsRoutes from './modules/wishlists/wishlists.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/wishlists`, wishlistsRoutes);

// Products routes
import productsRoutes from './modules/products/products.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/products`, productsRoutes);

// Categories routes 
import categoriesRoutes from './modules/products/categories.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/categories`, categoriesRoutes);

// Users routes
import usersRoutes from './modules/users/users.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/users`, usersRoutes);

// Feed routes
import feedRoutes from './modules/feed/feed.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/feed`, feedRoutes);

// Cart routes
import cartRoutes from './modules/cart/cart.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/cart`, cartRoutes);

// Dropi routes
import dropiRoutes from './modules/dropi/dropi.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/dropi`, dropiRoutes);

// Dropi Raw routes
import dropiRawRoutes from './modules/dropi-raw/dropi-raw.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/dropi`, dropiRawRoutes);

// Dropi Normalize routes
import dropiNormalizeRoutes from './modules/dropi-normalize/dropi-normalize.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/dropi`, dropiNormalizeRoutes);

// Dropi Enrich routes
import dropiEnrichRoutes from './modules/dropi-enrich/dropi-enrich.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/dropi`, dropiEnrichRoutes);

// Dropi Sync routes
import dropiSyncRoutes from './modules/dropi-sync/dropi-sync.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/dropi`, dropiSyncRoutes);

// Dropi Categories routes
import dropiCategoriesRoutes from './modules/dropi-categories/dropi-categories.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/dropi`, dropiCategoriesRoutes);

// Dropi Jobs routes
import dropiJobsRoutes from './modules/dropi-jobs/dropi-jobs.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/dropi/jobs`, dropiJobsRoutes);

// Posters routes normalizadas
import postersRoutes from './modules/posters/posters.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/posters`, postersRoutes);

// Stories routes normalizadas
import storiesRoutes from './modules/stories/stories.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/stories`, storiesRoutes);

// Orders routes (solo /api/v1/orders)
import ordersRoutes from './modules/orders/orders.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/orders`, ordersRoutes);

// Friends routes
import friendsRoutes from './modules/friends/friends.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/friends`, friendsRoutes);

// Groups routes (Red Tanku)
import groupsRoutes from './modules/groups/groups.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/groups`, groupsRoutes);

// Notifications routes
import notificationsRoutes from './modules/notifications/notifications.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/notifications`, notificationsRoutes);

// Chat routes
import chatRoutes from './modules/chat/chat.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/chat`, chatRoutes);

// StalkerGift routes
import stalkerGiftRoutes from './modules/stalker-gift/stalker-gift.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/stalker-gift`, stalkerGiftRoutes);

// ePayco webhook routes
import epaycoRoutes from './modules/orders/epayco.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/webhook/epayco`, epaycoRoutes);

// Dropi webhook routes
import dropiWebhookRoutes from './modules/orders/dropi-webhook.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/webhook/dropi`, dropiWebhookRoutes);

// Checkout routes (mover a /api/v1/checkout)
import checkoutRoutes from './modules/checkout/checkout.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/checkout`, checkoutRoutes);

/**
 * Manejo de errores 404
 */
app.use((req, res) => {
  // Solo loggear 404 en desarrollo
  if (env.NODE_ENV === 'development') {
    console.log(`⚠️ [404] ${req.method} ${req.path}`);
  }
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
  });
});

/**
 * Manejo de errores global
 */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    // Mapear códigos de estado HTTP a códigos de error
    let errorCode = ErrorCode.INTERNAL_ERROR;
    if (err.statusCode === 400) errorCode = ErrorCode.BAD_REQUEST;
    else if (err.statusCode === 401) errorCode = ErrorCode.UNAUTHORIZED;
    else if (err.statusCode === 403) errorCode = ErrorCode.FORBIDDEN;
    else if (err.statusCode === 404) errorCode = ErrorCode.NOT_FOUND;
    else if (err.statusCode === 409) errorCode = ErrorCode.CONFLICT;

    return res.status(err.statusCode).json(errorResponse(errorCode, err.message));
  }

  console.error('Error no manejado:', err);
  const message = env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message;
  return res.status(500).json(errorResponse(ErrorCode.INTERNAL_ERROR, message));
});

/**
 * Iniciar servidor
 */
async function startServer() {
  try {
    // BLOQUEADO: MongoDB deshabilitado temporalmente
    // await connectMongoDB();

    // Crear servidor HTTP (necesario para Socket.IO)
    const httpServer = createServer(app);

    // Inicializar Socket.IO (infraestructura de realtime)
    const socketService = getSocketService();
    socketService.initialize(httpServer);

    // Iniciar servidor HTTP
    httpServer.listen(APP_CONSTANTS.PORT, () => {
      console.log(`
🚀 Servidor Tanku Backend iniciado
📍 Puerto: ${APP_CONSTANTS.PORT}
🌍 Ambiente: ${APP_CONSTANTS.NODE_ENV}
🔗 API: http://localhost:${APP_CONSTANTS.PORT}${APP_CONSTANTS.API_PREFIX}
🔌 Socket.IO: Habilitado (realtime preparado)
      `);
    });

    // Manejo de cierre graceful
    process.on('SIGTERM', async () => {
      console.log('SIGTERM recibido, cerrando servidor...');
      httpServer.close(async () => {
        await closeConnections();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT recibido, cerrando servidor...');
      httpServer.close(async () => {
        await closeConnections();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    await closeConnections();
    process.exit(1);
  }
}

// Iniciar si es el archivo principal
if (require.main === module) {
  startServer();
}

export default app;

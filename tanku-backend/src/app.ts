import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env, getCorsOrigins } from './config/env';
import { connectMongoDB, closeConnections } from './config/database';
import { APP_CONSTANTS } from './config/constants';
import { AppError } from './shared/errors/AppError';

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
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'x-publishable-api-key'],
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
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
      categories: '/store/categories',
      products: '/store/product/',
      productsSDK: '/store/products',
    },
  });
});

/**
 * API Routes
 */
import authRoutes from './modules/auth/auth.routes';
import storeRoutes from './modules/store/store.routes';

app.get(`${APP_CONSTANTS.API_PREFIX}`, (_req, res) => {
  res.json({
    message: 'Tanku API v1',
    version: '1.0.0',
  });
});

// Auth routes
app.use(`${APP_CONSTANTS.API_PREFIX}/auth`, authRoutes);

// Auth routes sin prefijo (compatibilidad con frontend)
// El frontend llama directamente a /auth/google
app.use('/auth', authRoutes);

// Store routes sin prefijo (compatibilidad con SDK de Medusa)
// El frontend usa el SDK que espera /store/* directamente
// IMPORTANTE: Montar ANTES de la ruta con prefijo para que coincida primero
app.use('/store', storeRoutes);

// Store routes con prefijo API
app.use(`${APP_CONSTANTS.API_PREFIX}/store`, storeRoutes);

// Customers routes
import customersRoutes from './modules/customers/customers.routes';
app.use('/store/customers', customersRoutes);
app.use(`${APP_CONSTANTS.API_PREFIX}/store/customers`, customersRoutes);

// Cart routes
import cartRoutes from './modules/cart/cart.routes';
app.use('/store/carts', cartRoutes);
app.use('/store/cart', cartRoutes); // Rutas personalizadas del frontend
app.use(`${APP_CONSTANTS.API_PREFIX}/store/carts`, cartRoutes);
app.use(`${APP_CONSTANTS.API_PREFIX}/store/cart`, cartRoutes);

// Users/Personal Info routes (compatibilidad con frontend)
import usersRoutes from './modules/users/users.routes';
app.use('/personal-info', usersRoutes);
app.use(`${APP_CONSTANTS.API_PREFIX}/personal-info`, usersRoutes);

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

// Social routes (posts, posters, etc.)
import socialRoutes from './modules/social/social.routes';
app.use('/social', socialRoutes);
app.use(`${APP_CONSTANTS.API_PREFIX}/social`, socialRoutes);

// Orders routes
import ordersRoutes from './modules/orders/orders.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/orders`, ordersRoutes);
app.use('/store/orders', ordersRoutes); // Ruta para compatibilidad con frontend
app.use('/store/order', ordersRoutes); // Ruta para endpoints individuales (ej: /store/order/:id/dropi-status)

// ePayco webhook routes
import epaycoRoutes from './modules/orders/epayco.routes';
app.use(`${APP_CONSTANTS.API_PREFIX}/webhook/epayco`, epaycoRoutes);

// Checkout routes
import checkoutRoutes from './modules/checkout/checkout.routes';
app.use('/store/checkout', checkoutRoutes);

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
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  console.error('Error no manejado:', err);
  return res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/**
 * Iniciar servidor
 */
async function startServer() {
  try {
    // Conectar a MongoDB
    await connectMongoDB();

    // Iniciar servidor HTTP
    const server = app.listen(APP_CONSTANTS.PORT, () => {
      console.log(`
🚀 Servidor Tanku Backend iniciado
📍 Puerto: ${APP_CONSTANTS.PORT}
🌍 Ambiente: ${APP_CONSTANTS.NODE_ENV}
🔗 API: http://localhost:${APP_CONSTANTS.PORT}${APP_CONSTANTS.API_PREFIX}
      `);
    });

    // Manejo de cierre graceful
    process.on('SIGTERM', async () => {
      console.log('SIGTERM recibido, cerrando servidor...');
      server.close(async () => {
        await closeConnections();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT recibido, cerrando servidor...');
      server.close(async () => {
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

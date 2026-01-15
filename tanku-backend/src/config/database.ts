import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
// BLOQUEADO: MongoDB y Redis deshabilitados temporalmente
// import mongoose from 'mongoose';
// import Redis from 'ioredis';
import { env } from './env';

/**
 * Prisma Client (PostgreSQL) - Prisma 7
 * Requiere un adapter para PostgreSQL
 */
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
}); // ✅ Removido  ['query', 'error', 'warn'] porque se veia mucho en la consola y no servia para nada

/**
 * MongoDB Connection (Opcional en desarrollo)
 * DESHABILITADO TEMPORALMENTE - No disponible en Railway
 */
export async function connectMongoDB(): Promise<void> {
  // BLOQUEADO: MongoDB deshabilitado temporalmente
  console.log('ℹ️  MongoDB deshabilitado temporalmente');
  return;
  
  /* CÓDIGO COMENTADO - Reactivar cuando MongoDB esté disponible
  const shouldUseMongo = env.NODE_ENV === 'production' || env.MONGODB_ENABLED === true;
  const hasMongoUrl = env.MONGODB_URI && typeof env.MONGODB_URI === 'string' && env.MONGODB_URI.trim() !== '';

  if (!shouldUseMongo || !hasMongoUrl) {
    if (env.NODE_ENV === 'development') {
      console.log('ℹ️  MongoDB deshabilitado (modo desarrollo)');
    }
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI!);
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      console.warn('⚠️  MongoDB no disponible (opcional en desarrollo):', (error as Error).message);
    } else {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }
  */
}

/**
 * Redis Client (Opcional en desarrollo)
 * DESHABILITADO TEMPORALMENTE - No disponible en Railway
 */
// BLOQUEADO: Tipo Redis comentado temporalmente
// let redis: Redis | null = null;
let redis: any | null = null;

// BLOQUEADO: Redis deshabilitado temporalmente
console.log('ℹ️  Redis deshabilitado temporalmente');

/* CÓDIGO COMENTADO - Reactivar cuando Redis esté disponible
const shouldUseRedis = env.NODE_ENV === 'production' || env.REDIS_ENABLED === true;
const hasRedisUrl = env.REDIS_URL && typeof env.REDIS_URL === 'string' && env.REDIS_URL.trim() !== '';

if (shouldUseRedis && hasRedisUrl) {
  redis = new Redis(env.REDIS_URL!, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true, // No conectar automáticamente
  });

  redis.on('connect', () => {
    console.log('✅ Redis conectado exitosamente');
  });

  redis.on('error', (error) => {
    if (env.NODE_ENV === 'development') {
      console.warn('⚠️  Redis no disponible (opcional en desarrollo):', error.message);
    } else {
      console.error('❌ Error en Redis:', error);
    }
  });

  // Intentar conectar en background (no bloquea)
  redis.connect().catch(() => {
    if (env.NODE_ENV === 'development') {
      console.warn('⚠️  Redis no disponible. El servidor continuará sin cache.');
    }
  });
} else {
  if (env.NODE_ENV === 'development') {
    console.log('ℹ️  Redis deshabilitado (modo desarrollo)');
  }
}
*/

export { redis };

/**
 * Cerrar todas las conexiones
 */
export async function closeConnections(): Promise<void> {
  await Promise.all([
    prisma.$disconnect(),
    pool.end(), // Cerrar el pool de PostgreSQL
    // BLOQUEADO: MongoDB y Redis deshabilitados temporalmente
    // mongoose.connection.readyState === 1 ? mongoose.connection.close() : Promise.resolve(),
    // redis?.quit().catch(() => {}), // Ignorar errores al cerrar Redis
  ]);
  console.log('✅ Todas las conexiones cerradas');
}

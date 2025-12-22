import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Esquema de validación para variables de entorno
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('9000'),
  API_PREFIX: z.string().default('/api/v1'),

  // Databases
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),
  MONGODB_URI: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'MONGODB_URI debe ser una URL válida o estar vacío',
    })
    .transform((val) => (val === '' ? undefined : val)),
  MONGODB_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  REDIS_URL: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'REDIS_URL debe ser una URL válida o estar vacío',
    })
    .transform((val) => (val === '' ? undefined : val)),
  REDIS_ENABLED: z.string().transform((val) => val === 'true').default('false'),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET debe tener al menos 32 caracteres'),
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().int().positive().max(15)).default('10'),

  // CORS & Frontend
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL debe ser una URL válida').optional(),
  CORS_ORIGINS: z.string().default('http://localhost:8000'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID es requerido'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET es requerido'),
  GOOGLE_CALLBACK_URL: z.string().url('GOOGLE_CALLBACK_URL debe ser una URL válida'),

  // Dropi
  DROPI_BASE_URL: z.string().url('DROPI_BASE_URL debe ser una URL válida'),
  DROPI_STATIC_TOKEN: z.string().min(1, 'DROPI_STATIC_TOKEN es requerido'),
  DROPI_CDN_BASE: z.string().url('DROPI_CDN_BASE debe ser una URL válida').optional(),
  DROPI_PROXY_URL: z.string().url('DROPI_PROXY_URL debe ser una URL válida').optional(),
  DROPI_PROXY_KEY: z.string().optional(),

  // S3
  S3_FILE_URL: z.string().url('S3_FILE_URL debe ser una URL válida'),
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID es requerido'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY es requerido'),
  S3_REGION: z.string().min(1, 'S3_REGION es requerido'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET es requerido'),
  S3_ENDPOINT: z.string().url('S3_ENDPOINT debe ser una URL válida'),

  // ePayco
  EPAYCO_PUBLIC_KEY: z.string().min(1, 'EPAYCO_PUBLIC_KEY es requerido'),
  EPAYCO_PRIVATE_KEY: z.string().min(1, 'EPAYCO_PRIVATE_KEY es requerido'),
  EPAYCO_TEST_MODE: z.string().transform((val) => val === 'true').default('true'),
  EPAYCO_CONFIRMATION_URL: z.string().url('EPAYCO_CONFIRMATION_URL debe ser una URL válida'),
  EPAYCO_PSE_CUSTOMER_ID: z.string().optional(),

  // Socket.io
  SOCKET_CORS_ORIGINS: z.string().default('http://localhost:8000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default('100'),

  // Jobs & Cron
  ENABLE_CRON_JOBS: z.string().transform((val) => val === 'true').default('true'),
  DROPI_SYNC_CRON: z.string().default('0 */6 * * *'),

  // Feature Flags
  ENABLE_SOCIAL_FEATURES: z.string().transform((val) => val === 'true').default('true'),
  ENABLE_STALKER_GIFT: z.string().transform((val) => val === 'true').default('true'),
});

/**
 * Validar y parsear variables de entorno
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Error de validación de variables de entorno:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Variables de entorno validadas y tipadas
 */
export const env = validateEnv();

/**
 * Helper para obtener CORS origins como array
 */
export function getCorsOrigins(): string[] {
  return env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
}

/**
 * Helper para obtener Socket.io CORS origins como array
 */
export function getSocketCorsOrigins(): string[] {
  return env.SOCKET_CORS_ORIGINS.split(',').map((origin) => origin.trim());
}

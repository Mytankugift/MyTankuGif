import { env } from './env';

/**
 * Constantes de la aplicación
 */
export const APP_CONSTANTS = {
  // Server
  PORT: env.PORT,
  NODE_ENV: env.NODE_ENV,
  API_PREFIX: env.API_PREFIX,

  // JWT
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,

  // Bcrypt
  BCRYPT_ROUNDS: env.BCRYPT_ROUNDS,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: env.RATE_LIMIT_MAX_REQUESTS,

  // Feature Flags
  ENABLE_SOCIAL_FEATURES: env.ENABLE_SOCIAL_FEATURES,
  ENABLE_STALKER_GIFT: env.ENABLE_STALKER_GIFT,
  ENABLE_CRON_JOBS: env.ENABLE_CRON_JOBS,
} as const;

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Acceso prohibido',
  NOT_FOUND: 'Recurso no encontrado',
  VALIDATION_ERROR: 'Error de validación',
  INTERNAL_ERROR: 'Error interno del servidor',
  BAD_REQUEST: 'Solicitud inválida',
} as const;

/**
 * Códigos de estado HTTP
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

/**
 * Helpers para respuestas API normalizadas
 * Garantiza formato consistente en todas las respuestas
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Códigos de error estándar
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * Crea una respuesta de éxito normalizada
 */
export function successResponse<T>(
  data: T,
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  }
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && Object.keys(meta).length > 0 && { meta }),
  };
}

/**
 * Crea una respuesta de error normalizada
 */
export function errorResponse(
  code: string | ErrorCode,
  message: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}


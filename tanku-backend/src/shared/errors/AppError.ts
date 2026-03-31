import { HTTP_STATUS } from '../../config/constants';
import { ErrorCode } from '../response';
import type { ProductDTO } from '../dto/products.dto';

/**
 * Error personalizado de la aplicación
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  /** Si está definido, sustituye el mapeo por statusCode en la respuesta JSON (p. ej. AGE_RESTRICTED con 403). */
  public readonly apiCode?: string;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_ERROR,
    isOperational: boolean = true,
    apiCode?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.apiCode = apiCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errores comunes
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso prohibido') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Solicitud inválida') {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

/**
 * Contenido restringido por edad (403 + code AGE_RESTRICTED en API normalizada)
 */
export class AgeRestrictedError extends AppError {
  /** Vista previa del producto para mostrar UI (título, imágenes) sin exponer checkout hasta validar edad */
  public readonly teaser?: ProductDTO;

  constructor(message: string = 'Producto no disponible para menores de edad', teaser?: ProductDTO) {
    super(message, HTTP_STATUS.FORBIDDEN, true, ErrorCode.AGE_RESTRICTED);
    this.teaser = teaser;
  }
}

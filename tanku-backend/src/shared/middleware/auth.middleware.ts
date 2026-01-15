import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { UnauthorizedError } from '../errors/AppError';

const authService = new AuthService();

/**
 * Middleware de autenticación JWT
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autenticación requerido');
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    const payload = authService.verifyToken(token);

    // Agregar usuario al request
    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de autenticación opcional
 * No lanza error si no hay token, solo agrega el usuario si existe
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remover "Bearer "
      try {
        const payload = authService.verifyToken(token);
        // Agregar usuario al request si el token es válido
        req.user = {
          id: payload.userId,
          email: payload.email,
        };
      } catch (error) {
        // Si el token es inválido, simplemente continuar sin usuario
        // No lanzar error para permitir operaciones anónimas
      }
    }
    // Si no hay token, continuar sin usuario (carrito anónimo)
    next();
  } catch (error) {
    // En caso de error inesperado, continuar sin usuario
    next();
  }
};

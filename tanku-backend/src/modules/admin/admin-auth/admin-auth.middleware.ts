import { Request, Response, NextFunction } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { RequestWithAdminUser } from '../../../shared/types';

const adminAuthService = new AdminAuthService();

/**
 * Middleware de autenticación JWT para admin
 * Verifica el token y agrega req.adminUser al request
 */
export const authenticateAdmin = async (
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
    const payload = adminAuthService.verifyToken(token);

    // Verificar que el admin user existe y está activo
    const adminUser = await adminAuthService.getCurrentAdminUser(payload.adminUserId);

    // Agregar admin user al request
    const requestWithAdmin = req as RequestWithAdminUser;
    requestWithAdmin.adminUser = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};


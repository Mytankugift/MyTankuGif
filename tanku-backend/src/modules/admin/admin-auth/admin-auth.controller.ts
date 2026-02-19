import { Request, Response, NextFunction } from 'express';
import { AdminAuthService, AdminLoginInput } from './admin-auth.service';
import { BadRequestError } from '../../../shared/errors/AppError';
import { successResponse, errorResponse, ErrorCode } from '../../../shared/response';
import { RequestWithAdminUser } from '../../../shared/types';

export class AdminAuthController {
  private adminAuthService: AdminAuthService;

  constructor() {
    this.adminAuthService = new AdminAuthService();
  }

  /**
   * POST /api/v1/admin/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new BadRequestError('Email y contraseña son requeridos');
      }

      const input: AdminLoginInput = { email, password };
      const result = await this.adminAuthService.login(input);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/auth/me
   * Obtener admin user actual autenticado
   */
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }

      const adminUser = await this.adminAuthService.getCurrentAdminUser(
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(adminUser));
    } catch (error) {
      next(error);
    }
  };
}


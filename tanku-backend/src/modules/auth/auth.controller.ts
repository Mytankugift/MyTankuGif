import { Request, Response, NextFunction } from 'express';
import { AuthService, RegisterInput, LoginInput } from './auth.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/v1/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      if (!email || !password) {
        throw new BadRequestError('Email y contraseña son requeridos');
      }

      const input: RegisterInput = {
        email,
        password,
        firstName,
        lastName,
        phone,
      };

      const result = await this.authService.register(input);

      res.status(201).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new BadRequestError('Email y contraseña son requeridos');
      }

      const input: LoginInput = { email, password };
      const result = await this.authService.login(input);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/refresh
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new BadRequestError('Refresh token es requerido');
      }

      const result = await this.authService.refreshToken(refreshToken);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/auth/me
   * Obtener usuario actual autenticado
   */
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }

      const user = await this.authService.getCurrentUser(requestWithUser.user.id);

      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };
}

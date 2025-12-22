import { Request, Response, NextFunction } from 'express';
import { AuthService, RegisterInput, LoginInput } from './auth.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { ApiResponse } from '../../shared/types';

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

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Usuario registrado exitosamente',
      };

      res.status(201).json(response);
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

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Inicio de sesión exitoso',
      };

      res.status(200).json(response);
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

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

import { Request, Response, NextFunction } from 'express';
import { GoogleAuthService } from './google-auth.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { ApiResponse } from '../../shared/types';
import { env } from '../../config/env';
import { prisma } from '../../config/database';

export class GoogleAuthController {
  private googleAuthService: GoogleAuthService;

  constructor() {
    this.googleAuthService = new GoogleAuthService();
  }

  /**
   * GET /api/v1/auth/google
   * Inicia el flujo de autenticación con Google
   */
  initiate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { state } = req.query;
      
      // Debug: Log la URL de callback que se está usando
      console.log('🔍 [GOOGLE OAUTH DEBUG]');
      console.log('  GOOGLE_CALLBACK_URL from env:', env.GOOGLE_CALLBACK_URL);
      console.log('  Expected in Google Console:', 'http://localhost:9000/auth/google/callback');
      console.log('  Match:', env.GOOGLE_CALLBACK_URL === 'http://localhost:9000/auth/google/callback');
      
      const authUrl = this.googleAuthService.generateAuthUrl(state as string);
      
      // Debug: Log la URL completa generada
      console.log('  Generated auth URL:', authUrl);
      
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/auth/google/callback
   * Callback de Google OAuth
   */
  callback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state, error } = req.query;
      const frontendUrl = env.FRONTEND_URL;
      const callbackUrl = `${frontendUrl}/auth/google/callback`;

      // Si hay un error de Google
      if (error) {
        console.error('Error en autenticación de Google:', error);
        return res.redirect(`${callbackUrl}?error=${encodeURIComponent(error as string)}`);
      }

      if (!code) {
        console.error('❌ [GOOGLE OAUTH] No se recibió código de autorización');
        return res.redirect(`${callbackUrl}?error=missing_code`);
      }

      console.log('🔄 [GOOGLE OAUTH] Intercambiando código por tokens...');
      // Intercambiar código por tokens
      const accessToken = await this.googleAuthService.exchangeCodeForTokens(code as string);

      console.log('✅ [GOOGLE OAUTH] Tokens obtenidos, obteniendo información del usuario...');
      // Obtener información del usuario
      const userInfo = await this.googleAuthService.getUserInfo(accessToken);

      console.log('🔄 [GOOGLE OAUTH] Autenticando/creando usuario...');
      // Autenticar o crear usuario
      const authResult = await this.googleAuthService.authenticateWithGoogle(userInfo);

      // Redirigir al frontend con los tokens
      // El frontend espera 'token' (no 'accessToken')
      const redirectUrl = new URL(callbackUrl);
      redirectUrl.searchParams.set('token', authResult.accessToken);
      // También enviar customer_id como fallback (el frontend lo usa)
      redirectUrl.searchParams.set('customer_id', authResult.user.id);

      console.log('✅ [GOOGLE OAUTH] Autenticación exitosa, redirigiendo al frontend con token');
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('❌ [GOOGLE OAUTH] Error en callback:', error);
      const frontendUrl = env.FRONTEND_URL;
      const callbackUrl = `${frontendUrl}/auth/google/callback`;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('  Redirigiendo al frontend con error:', errorMessage);
      res.redirect(`${callbackUrl}?error=${encodeURIComponent(errorMessage)}`);
    }
  };

  /**
   * POST /api/v1/auth/google/complete
   * Completa la autenticación (para compatibilidad con el frontend existente)
   */
  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customer_id } = req.body;

      if (!customer_id) {
        throw new BadRequestError('customer_id es requerido');
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { id: customer_id },
      });

      if (!user) {
        throw new BadRequestError('Usuario no encontrado');
      }

      // Generar token
      const { AuthService } = await import('./auth.service');
      const authService = new AuthService();
      const tokens = authService.generateTokens(user);

      const response: ApiResponse = {
        success: true,
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

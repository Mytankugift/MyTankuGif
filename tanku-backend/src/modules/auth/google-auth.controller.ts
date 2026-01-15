import { Request, Response, NextFunction } from 'express';
import { GoogleAuthService } from './google-auth.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { AuthService } from './auth.service';

export class GoogleAuthController {
  private googleAuthService: GoogleAuthService;

  constructor() {
    this.googleAuthService = new GoogleAuthService();
  }

  /**
   * GET /api/v1/auth/google
   * Inicia el flujo de autenticación con Google
   * 
   * Query params:
   * - state: (opcional) Estado original para mantener contexto
   * - return_url: (opcional) URL a la que redirigir después del login
   */
  initiate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { state, return_url } = req.query;
      
      // Debug: Log la URL de callback que se está usando
      console.log('🔍 [GOOGLE OAUTH DEBUG]');
      console.log('  GOOGLE_CALLBACK_URL from env:', env.GOOGLE_CALLBACK_URL);
      console.log('  IMPORTANTE: Esta debe ser la URL del BACKEND, no del frontend');
      console.log('  Ejemplo correcto (producción):', 'https://mytanku-production.up.railway.app/api/v1/auth/google/callback');
      console.log('  Ejemplo correcto (local):', 'http://localhost:9000/api/v1/auth/google/callback');
      
      // Verificar que GOOGLE_CALLBACK_URL sea la URL del backend
      if (env.GOOGLE_CALLBACK_URL.includes('/auth/google/callback') && !env.GOOGLE_CALLBACK_URL.includes('/api/v1/auth/google/callback')) {
        console.warn('⚠️ [GOOGLE OAUTH] ADVERTENCIA: GOOGLE_CALLBACK_URL parece apuntar al frontend, debe apuntar al backend');
        console.warn('   Actual:', env.GOOGLE_CALLBACK_URL);
        console.warn('   Debería ser algo como: https://YOUR-BACKEND-URL.railway.app/api/v1/auth/google/callback');
      }
      
      // Si hay return_url, codificarlo en el state junto con el state original
      let stateToEncode: string;
      if (return_url) {
        const stateData = {
          originalState: state || null,
          returnUrl: return_url as string,
        };
        stateToEncode = JSON.stringify(stateData);
        console.log('📌 [GOOGLE OAUTH] return_url detectado, codificando en state:', return_url);
      } else {
        stateToEncode = (state as string) || '';
      }
      
      const authUrl = this.googleAuthService.generateAuthUrl(stateToEncode);
      
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
      
      // Verificar que FRONTEND_URL esté configurada
      if (!env.FRONTEND_URL) {
        console.error('❌ [GOOGLE OAUTH] FRONTEND_URL no está configurada en las variables de entorno');
        return res.status(500).json({ 
          error: 'Error de configuración: FRONTEND_URL no está configurada' 
        });
      }

      const frontendUrl = env.FRONTEND_URL;
      const callbackUrl = `${frontendUrl}/auth/google/callback`;

      console.log('📥 [GOOGLE OAUTH] Callback recibido:', {
        hasCode: !!code,
        hasError: !!error,
        hasState: !!state,
        frontendUrl,
        callbackUrl,
      });

      // Si hay un error de Google
      if (error) {
        console.error('❌ [GOOGLE OAUTH] Error recibido de Google:', error);
        return res.redirect(`${callbackUrl}?error=${encodeURIComponent(error as string)}`);
      }

      if (!code) {
        console.error('❌ [GOOGLE OAUTH] No se recibió código de autorización');
        console.error('   Query params recibidos:', req.query);
        return res.redirect(`${callbackUrl}?error=missing_code`);
      }

      console.log('🔄 [GOOGLE OAUTH] Intercambiando código por tokens...');
      // Intercambiar código por tokens
      const accessToken = await this.googleAuthService.exchangeCodeForTokens(code as string);

      if (!accessToken) {
        console.error('❌ [GOOGLE OAUTH] No se obtuvo access token');
        return res.redirect(`${callbackUrl}?error=token_exchange_failed`);
      }

      console.log('✅ [GOOGLE OAUTH] Tokens obtenidos, obteniendo información del usuario...');
      // Obtener información del usuario
      const userInfo = await this.googleAuthService.getUserInfo(accessToken);

      if (!userInfo || !userInfo.email) {
        console.error('❌ [GOOGLE OAUTH] No se obtuvo información del usuario');
        return res.redirect(`${callbackUrl}?error=user_info_failed`);
      }

      console.log('🔄 [GOOGLE OAUTH] Autenticando/creando usuario...');
      // Autenticar o crear usuario
      const authResult = await this.googleAuthService.authenticateWithGoogle(userInfo);

      if (!authResult || !authResult.accessToken) {
        console.error('❌ [GOOGLE OAUTH] No se obtuvo token de autenticación');
        return res.redirect(`${callbackUrl}?error=authentication_failed`);
      }

      // Decodificar state para obtener return_url si existe
      let returnUrl: string | null = null;
      if (state) {
        try {
          const stateData = JSON.parse(state as string);
          if (stateData.returnUrl) {
            returnUrl = stateData.returnUrl;
            console.log('📌 [GOOGLE OAUTH] return_url decodificado del state:', returnUrl);
          }
        } catch {
          // State no es JSON, ignorar (es un state simple)
          console.log('📌 [GOOGLE OAUTH] State no contiene return_url (state simple)');
        }
      }

      // Redirigir al frontend con los tokens en el callback específico
      // El frontend espera recibir los tokens en /auth/google/callback
      const redirectUrl = new URL(`${frontendUrl}/auth/google/callback`);
      redirectUrl.searchParams.set('token', authResult.accessToken);
      if (authResult.user?.id) {
        redirectUrl.searchParams.set('userId', authResult.user.id);
      }
      
      // Agregar return_url si existe
      if (returnUrl) {
        redirectUrl.searchParams.set('return_url', returnUrl);
        console.log('📌 [GOOGLE OAUTH] return_url agregado a la redirección:', returnUrl);
      }

      console.log('✅ [GOOGLE OAUTH] Autenticación exitosa, redirigiendo al frontend');
      console.log('   URL de redirección:', redirectUrl.toString());
      console.log('   Token presente:', !!authResult.accessToken);
      console.log('   User ID:', authResult.user?.id);
      console.log('   Return URL:', returnUrl || 'ninguno');

      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('❌ [GOOGLE OAUTH] Error en callback:', error);
      console.error('   Stack:', error instanceof Error ? error.stack : 'No stack available');
      
      try {
        const frontendUrl = env.FRONTEND_URL || 'https://www.mytanku.com';
        const callbackUrl = `${frontendUrl}/auth/google/callback`;
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('   Redirigiendo al frontend con error:', errorMessage);
        res.redirect(`${callbackUrl}?error=${encodeURIComponent(errorMessage)}`);
      } catch (redirectError) {
        console.error('❌ [GOOGLE OAUTH] Error crítico al redirigir:', redirectError);
        res.status(500).json({ 
          error: 'Error crítico en la autenticación',
          message: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
  };

  /**
   * POST /api/v1/auth/google/complete
   * Completa la autenticación (para compatibilidad con el frontend existente)
   * @deprecated Usar el callback GET /api/v1/auth/google/callback en su lugar
   */
  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        throw new BadRequestError('userId es requerido');
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestError('Usuario no encontrado');
      }

      // Obtener usuario con perfil para el mapper
      const userWithProfile = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!userWithProfile) {
        throw new BadRequestError('Usuario no encontrado');
      }

      // Generar tokens usando el servicio normalizado
      const authService = new AuthService();
      const tokens = authService.generateTokens(userWithProfile);

      // Devolver formato normalizado AuthResponseDTO
      res.status(200).json(successResponse(tokens));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/customer/google/callback
   * Callback de Google OAuth para el frontend (compatibilidad con Medusa)
   * El frontend envía el código y espera recibir el token en JSON
   */
  customerCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state } = req.body;

      if (!code) {
        throw new BadRequestError('Código de autorización es requerido');
      }

      console.log('🔄 [GOOGLE OAUTH CUSTOMER] Intercambiando código por tokens...');
      // Intercambiar código por tokens
      const accessToken = await this.googleAuthService.exchangeCodeForTokens(code);

      console.log('✅ [GOOGLE OAUTH CUSTOMER] Tokens obtenidos, obteniendo información del usuario...');
      // Obtener información del usuario
      const userInfo = await this.googleAuthService.getUserInfo(accessToken);

      console.log('🔄 [GOOGLE OAUTH CUSTOMER] Autenticando/creando usuario...');
      // Autenticar o crear usuario
      const authResult = await this.googleAuthService.authenticateWithGoogle(userInfo);

      // Devolver formato normalizado AuthResponseDTO
      console.log('✅ [GOOGLE OAUTH CUSTOMER] Autenticación exitosa, devolviendo token');
      res.status(200).json(successResponse(authResult));
    } catch (error) {
      console.error('❌ [GOOGLE OAUTH CUSTOMER] Error en callback:', error);
      next(error);
    }
  };
}

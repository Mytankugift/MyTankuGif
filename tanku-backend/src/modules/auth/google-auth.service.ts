import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { AuthService } from './auth.service';
import { BadRequestError } from '../../shared/errors/AppError';

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  id: string; // Google ID
}

export class GoogleAuthService {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Intercambiar código de autorización por tokens de Google
   */
  async exchangeCodeForTokens(code: string): Promise<string> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new BadRequestError(`Error obteniendo tokens de Google: ${errorData}`);
    }

    const tokens = await tokenResponse.json() as { access_token: string };
    return tokens.access_token;
  }

  /**
   * Obtener información del usuario de Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new BadRequestError('Error obteniendo información del usuario de Google');
    }

    const userInfo = await userResponse.json() as {
      email: string;
      name: string;
      picture?: string;
      id: string;
    };
    const { email, name, picture, id } = userInfo;

    if (!email) {
      throw new BadRequestError('No se pudo obtener el email de Google');
    }

    return {
      email,
      name: name || '',
      picture,
      id,
    };
  }

  /**
   * Autenticar o crear usuario con Google
   */
  async authenticateWithGoogle(googleUserInfo: GoogleUserInfo) {
    const { email, name, picture, id: googleId } = googleUserInfo;

    // Buscar usuario existente por email
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        personalInfo: true,
        onboardingStatus: true,
      },
    });

    if (user) {
      // Usuario existe, actualizar información de Google si es necesario
      // (por ahora solo generamos tokens)
    } else {
      // Crear nuevo usuario
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = await prisma.user.create({
        data: {
          email,
          password: null, // Sin contraseña para usuarios OAuth
          firstName,
          lastName,
          emailVerified: true, // Google ya verificó el email
        },
        include: {
          profile: true,
          personalInfo: true,
          onboardingStatus: true,
        },
      });

      // Crear perfil, onboarding e información personal
      await Promise.all([
        prisma.userProfile.create({
          data: {
            userId: user.id,
            avatar: picture || undefined,
          },
        }),
        prisma.onboardingStatus.create({
          data: { userId: user.id },
        }),
        prisma.personalInformation.create({
          data: { userId: user.id },
        }),
      ]);
    }

    // Generar tokens JWT
    return this.authService.generateTokens(user);
  }

  /**
   * Generar URL de autenticación de Google
   */
  generateAuthUrl(state?: string): string {
    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri = env.GOOGLE_CALLBACK_URL;
    const scope = 'email profile';
    const responseType = 'code';

    // Generar state si no se proporciona
    const authState = state || Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      scope,
      state: authState,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { BadRequestError, UnauthorizedError, ConflictError } from '../../shared/errors/AppError';
import { JwtPayload } from '../../shared/types';

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export class AuthService {
  /**
   * Registrar nuevo usuario
   */
  async register(input: RegisterInput): Promise<AuthTokens> {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
    });

    // Crear perfil y onboarding
    await Promise.all([
      prisma.userProfile.create({
        data: { userId: user.id },
      }),
      prisma.onboardingStatus.create({
        data: { userId: user.id },
      }),
      prisma.personalInformation.create({
        data: { userId: user.id },
      }),
    ]);

    // Generar tokens
    return this.generateTokens(user);
  }

  /**
   * Iniciar sesión
   */
  async login(input: LoginInput): Promise<AuthTokens> {
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(input.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Generar tokens
    return this.generateTokens(user);
  }

  /**
   * Generar tokens JWT
   */
  generateTokens(user: any): AuthTokens {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as SignOptions);

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
    } as SignOptions);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
    };
  }

  /**
   * Refrescar token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new UnauthorizedError('Usuario no encontrado');
      }

      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
      };

      const accessToken = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as string,
      } as SignOptions);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedError('Token inválido o expirado');
    }
  }

  /**
   * Verificar token
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedError('Token inválido o expirado');
    }
  }
}

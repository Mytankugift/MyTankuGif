import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { BadRequestError, UnauthorizedError, ConflictError } from '../../shared/errors/AppError';
import { JwtPayload } from '../../shared/types';
import { UserPublicDTO, AuthResponseDTO } from '../../shared/dto/auth.dto';
import type { User, UserProfile } from '@prisma/client';

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

export class AuthService {
  /**
   * Mapper: Convierte User de Prisma a UserPublicDTO
   */
  private mapUserToPublicDTO(user: User & { profile?: UserProfile | null }): UserPublicDTO {
    // Parsear socialLinks desde JSON si existe
    let socialLinks: { platform: string; url: string }[] | undefined = undefined;
    if (user.profile?.socialLinks) {
      try {
        const parsed = typeof user.profile.socialLinks === 'string' 
          ? JSON.parse(user.profile.socialLinks) 
          : user.profile.socialLinks;
        socialLinks = Array.isArray(parsed) ? parsed : undefined;
      } catch (error) {
        console.error('Error parsing socialLinks:', error);
      }
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      profile: user.profile
        ? {
            avatar: user.profile.avatar,
            banner: user.profile.banner,
            bio: user.profile.bio,
            socialLinks,
          }
        : null,
    };
  }
  /**
   * Registrar nuevo usuario
   */
  async register(input: RegisterInput): Promise<AuthResponseDTO> {
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

    // Crear perfil e información personal
    await Promise.all([
      prisma.userProfile.create({
        data: { userId: user.id },
      }),
      prisma.personalInformation.create({
        data: { userId: user.id },
      }),
    ]);

    // Obtener usuario con perfil para el mapper
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    if (!userWithProfile) {
      throw new BadRequestError('Error al crear usuario');
    }

    // Generar tokens
    return this.generateTokens(userWithProfile);
  }

  /**
   * Iniciar sesión
   */
  async login(input: LoginInput): Promise<AuthResponseDTO> {
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

    // Obtener usuario con perfil para el mapper
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    if (!userWithProfile) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    // Generar tokens
    return this.generateTokens(userWithProfile);
  }

  /**
   * Generar tokens JWT y devolver AuthResponseDTO
   */
  generateTokens(user: User & { profile?: UserProfile | null }): AuthResponseDTO {
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
      user: this.mapUserToPublicDTO(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Obtener usuario actual por ID
   */
  async getCurrentUser(userId: string): Promise<UserPublicDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    return this.mapUserToPublicDTO(user);
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

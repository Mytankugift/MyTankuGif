import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../../config/env';
import { prisma } from '../../../config/database';
import { BadRequestError, UnauthorizedError } from '../../../shared/errors/AppError';
import type { AdminUser, AdminRole } from '@prisma/client';

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminJwtPayload {
  adminUserId: string;
  email: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}

export interface AdminAuthResponse {
  user: {
    id: string;
    email: string;
    role: AdminRole;
    firstName: string | null;
    lastName: string | null;
    active: boolean;
  };
  token: string;
}

export class AdminAuthService {
  /**
   * Iniciar sesión como admin
   */
  async login(input: AdminLoginInput): Promise<AdminAuthResponse> {
    // Buscar admin user
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: input.email },
    });

    if (!adminUser) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Verificar que esté activo
    if (!adminUser.active) {
      throw new UnauthorizedError('Usuario admin desactivado');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(input.password, adminUser.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Generar token
    const token = this.generateToken(adminUser);

    return {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        active: adminUser.active,
      },
      token,
    };
  }

  /**
   * Generar token JWT para admin
   */
  generateToken(adminUser: AdminUser): string {
    const payload: AdminJwtPayload = {
      adminUserId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as SignOptions);
  }

  /**
   * Verificar token JWT de admin
   */
  verifyToken(token: string): AdminJwtPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Token inválido o expirado');
    }
  }

  /**
   * Obtener admin user actual por ID
   */
  async getCurrentAdminUser(adminUserId: string): Promise<{
    id: string;
    email: string;
    role: AdminRole;
    firstName: string | null;
    lastName: string | null;
    active: boolean;
  }> {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        active: true,
      },
    });

    if (!adminUser) {
      throw new UnauthorizedError('Usuario admin no encontrado');
    }

    if (!adminUser.active) {
      throw new UnauthorizedError('Usuario admin desactivado');
    }

    return adminUser;
  }
}


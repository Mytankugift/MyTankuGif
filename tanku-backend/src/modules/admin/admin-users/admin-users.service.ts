import bcrypt from 'bcrypt';
import { prisma } from '../../../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../../shared/errors/AppError';
import type { AdminUser, AdminRole } from '@prisma/client';

export interface CreateAdminUserInput {
  email: string;
  password: string;
  role: AdminRole;
  firstName?: string;
  lastName?: string;
  active?: boolean;
}

export interface UpdateAdminUserInput {
  email?: string;
  password?: string;
  role?: AdminRole;
  firstName?: string;
  lastName?: string;
  active?: boolean;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  role: AdminRole;
  firstName: string | null;
  lastName: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AdminUserService {
  /**
   * Listar todos los usuarios admin
   */
  async listUsers(): Promise<AdminUserResponse[]> {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  /**
   * Obtener usuario admin por ID
   */
  async getUserById(id: string): Promise<AdminUserResponse> {
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario admin no encontrado');
    }

    return user;
  }

  /**
   * Crear nuevo usuario admin
   */
  async createUser(input: CreateAdminUserInput, createdBy: string): Promise<AdminUserResponse> {
    // Verificar que el email no exista
    const existingUser = await prisma.adminUser.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new BadRequestError('El email ya está registrado');
    }

    // Validar email
    if (!this.isValidEmail(input.email)) {
      throw new BadRequestError('Email inválido');
    }

    // Validar contraseña
    if (input.password.length < 6) {
      throw new BadRequestError('La contraseña debe tener al menos 6 caracteres');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Crear usuario
    const user = await prisma.adminUser.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: input.role,
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        active: input.active !== undefined ? input.active : true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Actualizar usuario admin
   */
  async updateUser(
    id: string,
    input: UpdateAdminUserInput,
    updatedBy: string
  ): Promise<AdminUserResponse> {
    // Verificar que el usuario exista
    const existingUser = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('Usuario admin no encontrado');
    }

    // Verificar que no se esté desactivando a sí mismo
    if (id === updatedBy && input.active === false) {
      throw new BadRequestError('No puedes desactivarte a ti mismo');
    }

    // Si se está actualizando el email, verificar que no exista
    if (input.email && input.email !== existingUser.email) {
      const emailExists = await prisma.adminUser.findUnique({
        where: { email: input.email },
      });

      if (emailExists) {
        throw new BadRequestError('El email ya está registrado');
      }

      if (!this.isValidEmail(input.email)) {
        throw new BadRequestError('Email inválido');
      }
    }

    // Si se está actualizando la contraseña, hashearla
    const updateData: any = {
      ...(input.email && { email: input.email }),
      ...(input.role && { role: input.role }),
      ...(input.firstName !== undefined && { firstName: input.firstName || null }),
      ...(input.lastName !== undefined && { lastName: input.lastName || null }),
      ...(input.active !== undefined && { active: input.active }),
    };

    if (input.password) {
      if (input.password.length < 6) {
        throw new BadRequestError('La contraseña debe tener al menos 6 caracteres');
      }
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Eliminar usuario admin
   */
  async deleteUser(id: string, deletedBy: string): Promise<void> {
    // Verificar que el usuario exista
    const existingUser = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('Usuario admin no encontrado');
    }

    // Verificar que no se esté eliminando a sí mismo
    if (id === deletedBy) {
      throw new BadRequestError('No puedes eliminarte a ti mismo');
    }

    // Verificar que no sea el último SUPER_ADMIN
    const superAdminCount = await prisma.adminUser.count({
      where: {
        role: 'SUPER_ADMIN',
        active: true,
      },
    });

    if (existingUser.role === 'SUPER_ADMIN' && superAdminCount === 1) {
      throw new ForbiddenError('No se puede eliminar el último SUPER_ADMIN activo');
    }

    await prisma.adminUser.delete({
      where: { id },
    });
  }

  /**
   * Validar formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}


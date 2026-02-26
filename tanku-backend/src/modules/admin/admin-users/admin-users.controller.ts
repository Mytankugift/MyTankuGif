import { Request, Response, NextFunction } from 'express';
import { AdminUserService, CreateAdminUserInput, UpdateAdminUserInput } from './admin-users.service';
import { BadRequestError } from '../../../shared/errors/AppError';
import { successResponse, errorResponse, ErrorCode } from '../../../shared/response';
import { RequestWithAdminUser } from '../../../shared/types';

export class AdminUserController {
  private adminUserService: AdminUserService;

  constructor() {
    this.adminUserService = new AdminUserService();
  }

  /**
   * GET /api/v1/admin/users
   * Listar todos los usuarios admin
   */
  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.adminUserService.listUsers();
      res.status(200).json(successResponse(users));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/users/:id
   * Obtener usuario admin por ID
   */
  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('ID de usuario es requerido');
      }

      const user = await this.adminUserService.getUserById(id);
      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/users
   * Crear nuevo usuario admin
   */
  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }

      const { email, password, role, firstName, lastName, active } = req.body;

      if (!email || !password || !role) {
        throw new BadRequestError('Email, contraseña y rol son requeridos');
      }

      if (!['SUPER_ADMIN', 'PRODUCT_MANAGER'].includes(role)) {
        throw new BadRequestError('Rol inválido. Debe ser SUPER_ADMIN o PRODUCT_MANAGER');
      }

      const input: CreateAdminUserInput = {
        email,
        password,
        role,
        firstName,
        lastName,
        active,
      };

      const user = await this.adminUserService.createUser(input, requestWithAdmin.adminUser.id);
      res.status(201).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/users/:id
   * Actualizar usuario admin
   */
  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }

      const { id } = req.params;
      const { email, password, role, firstName, lastName, active } = req.body;

      if (!id) {
        throw new BadRequestError('ID de usuario es requerido');
      }

      if (role && !['SUPER_ADMIN', 'PRODUCT_MANAGER'].includes(role)) {
        throw new BadRequestError('Rol inválido. Debe ser SUPER_ADMIN o PRODUCT_MANAGER');
      }

      const input: UpdateAdminUserInput = {
        ...(email && { email }),
        ...(password && { password }),
        ...(role && { role }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(active !== undefined && { active }),
      };

      const user = await this.adminUserService.updateUser(id, input, requestWithAdmin.adminUser.id);
      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/admin/users/:id
   * Eliminar usuario admin
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }

      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('ID de usuario es requerido');
      }

      await this.adminUserService.deleteUser(id, requestWithAdmin.adminUser.id);
      res.status(200).json(successResponse({ message: 'Usuario eliminado exitosamente' }));
    } catch (error) {
      next(error);
    }
  };
}


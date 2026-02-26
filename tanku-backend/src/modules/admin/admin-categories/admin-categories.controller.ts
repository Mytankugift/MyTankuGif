import { Request, Response, NextFunction } from 'express';
import { AdminCategoryService, CategoryFilters } from './admin-categories.service';
import { BadRequestError } from '../../../shared/errors/AppError';
import { successResponse } from '../../../shared/response';
import { RequestWithAdminUser } from '../../../shared/types';
import { S3Service } from '../../../shared/services/s3.service';

export class AdminCategoryController {
  private adminCategoryService: AdminCategoryService;

  constructor() {
    this.adminCategoryService = new AdminCategoryService();
  }

  /**
   * GET /api/v1/admin/categories
   * Listar categorías en formato de árbol
   */
  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, blocked, parentId } = req.query;

      const filters: CategoryFilters = {
        ...(search && { search: search as string }),
        ...(blocked !== undefined && blocked !== '' && { blocked: blocked === 'true' }),
        ...(parentId !== undefined && { parentId: parentId === 'null' ? null : (parentId as string) }),
      };

      const categories = await this.adminCategoryService.getCategories(filters);
      res.status(200).json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/categories/:id
   * Obtener categoría por ID
   */
  getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await this.adminCategoryService.getCategoryById(id);
      res.status(200).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/categories
   * Crear nueva categoría
   */
  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      const adminUserId = requestWithAdmin.adminUser!.id;

      const { name, description, parentId, handle } = req.body;

      if (!name || name.trim() === '') {
        throw new BadRequestError('El nombre de la categoría es requerido');
      }

      const category = await this.adminCategoryService.createCategory(
        {
          name,
          description,
          parentId: parentId === 'null' || parentId === null ? null : parentId,
          handle,
        },
        adminUserId
      );

      res.status(201).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/categories/:id
   * Actualizar categoría
   */
  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      const adminUserId = requestWithAdmin.adminUser!.id;

      const { id } = req.params;
      const { name, description, parentId } = req.body;

      // Validar que no se intente cambiar dropiId
      // (dropiId no debe estar en el body, pero por seguridad verificamos)
      if (req.body.dropiId !== undefined) {
        throw new BadRequestError('No se puede modificar el dropiId de una categoría');
      }

      const category = await this.adminCategoryService.updateCategory(
        id,
        {
          name,
          description,
          parentId: parentId === 'null' || parentId === null ? null : parentId,
        },
        adminUserId
      );

      res.status(200).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/admin/categories/:id
   * Eliminar categoría
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      const adminUserId = requestWithAdmin.adminUser!.id;

      const { id } = req.params;
      await this.adminCategoryService.deleteCategory(id, adminUserId);

      res.status(200).json(successResponse({ message: 'Categoría eliminada exitosamente' }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/categories/:id/block
   * Bloquear/desbloquear categoría
   */
  toggleBlock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      const adminUserId = requestWithAdmin.adminUser!.id;

      const { id } = req.params;
      const { blocked, unblockChildren } = req.body;

      if (typeof blocked !== 'boolean') {
        throw new BadRequestError('El campo "blocked" debe ser un booleano');
      }

      const category = await this.adminCategoryService.toggleBlock(
        id, 
        blocked, 
        adminUserId,
        unblockChildren !== undefined ? Boolean(unblockChildren) : undefined
      );

      res.status(200).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/categories/:id/image
   * Subir imagen de categoría
   */
  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      const adminUserId = requestWithAdmin.adminUser!.id;

      const { id } = req.params;
      const file = req.file;

      if (!file) {
        throw new BadRequestError('Se requiere un archivo de imagen');
      }

      const category = await this.adminCategoryService.uploadImage(id, file, adminUserId);

      res.status(200).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/admin/categories/:id/image
   * Eliminar imagen de categoría
   */
  removeImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      const adminUserId = requestWithAdmin.adminUser!.id;

      const { id } = req.params;
      const category = await this.adminCategoryService.removeImage(id, adminUserId);

      res.status(200).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/categories/:id/default-formula
   * Configurar fórmula de precio por defecto
   */
  setDefaultPriceFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      const adminUserId = requestWithAdmin.adminUser!.id;

      const { id } = req.params;
      const { formulaId } = req.body;

      if (!formulaId || typeof formulaId !== 'string') {
        throw new BadRequestError('El campo "formulaId" es requerido');
      }

      const category = await this.adminCategoryService.setDefaultPriceFormula(id, formulaId, adminUserId);

      res.status(200).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };
}


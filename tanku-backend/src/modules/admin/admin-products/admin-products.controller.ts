import { Request, Response, NextFunction } from 'express';
import { AdminProductService, ProductFilters, ProductPagination } from './admin-products.service';
import { BadRequestError } from '../../../shared/errors/AppError';
import { successResponse, errorResponse, ErrorCode } from '../../../shared/response';
import { RequestWithAdminUser } from '../../../shared/types';
import { S3Service } from '../../../shared/services/s3.service';

export class AdminProductController {
  private adminProductService: AdminProductService;

  constructor() {
    this.adminProductService = new AdminProductService();
  }

  /**
   * GET /api/v1/admin/products
   * Listar productos con filtros y paginación
   */
  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        search,
        categoryId,
        active,
        lockedByAdmin,
        inRanking,
        sortBy,
        page,
        limit,
      } = req.query;

      const filters: ProductFilters = {
        ...(search && { search: search as string }),
        ...(categoryId !== undefined && { categoryId: categoryId === 'null' ? 'null' : (categoryId as string) }),
        ...(active !== undefined && active !== '' && { active: active === 'true' }),
        ...(lockedByAdmin !== undefined && lockedByAdmin !== '' && { lockedByAdmin: lockedByAdmin === 'true' }),
        ...(inRanking !== undefined && inRanking !== '' && { inRanking: inRanking === 'true' }),
        ...(sortBy && { sortBy: sortBy as 'default' | 'ranking' }),
      };

      const pagination: ProductPagination = {
        ...(page && { page: parseInt(page as string, 10) }),
        ...(limit && { limit: parseInt(limit as string, 10) }),
      };

      const result = await this.adminProductService.getProducts(filters, pagination);
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/products/:id
   * Obtener producto por ID con todas sus variantes
   */
  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      const product = await this.adminProductService.getProductById(id);
      res.status(200).json(successResponse(product));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/products/:id/toggle-active
   * Cambiar estado activo/inactivo de un producto
   */
  toggleProductActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (typeof active !== 'boolean') {
        throw new BadRequestError('El campo "active" debe ser un booleano');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      await this.adminProductService.toggleProductActive(
        id,
        active,
        requestWithAdmin.adminUser.id
      );
      res.status(200).json(successResponse({ message: `Producto marcado como ${active ? 'activo' : 'inactivo'}` }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/products/:id
   * Actualizar producto (título, descripción, categoría)
   * Bloquea automáticamente el producto
   */
  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { title, description, categoryId } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      // Validar que al menos un campo se esté actualizando
      if (title === undefined && description === undefined && categoryId === undefined) {
        throw new BadRequestError('Debe proporcionar al menos un campo para actualizar');
      }

      const updatedProduct = await this.adminProductService.updateProduct(
        id,
        {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(categoryId !== undefined && { categoryId }),
        },
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(updatedProduct));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/products/:productId/variants/:variantId/title
   * Actualizar título de una variante
   * Bloquea automáticamente el producto
   */
  updateVariantTitle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { variantId } = req.params;
      const { title } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!variantId) {
        throw new BadRequestError('ID de variante es requerido');
      }

      if (!title || typeof title !== 'string') {
        throw new BadRequestError('El campo "title" es requerido y debe ser un string');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      await this.adminProductService.updateVariantTitle(
        variantId,
        title,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse({ message: 'Título de variante actualizado correctamente' }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/products/:id/reorder-images
   * Reordenar imágenes: mover una imagen a la primera posición (imagen principal)
   * Bloquea automáticamente el producto
   */
  reorderImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { imageIndex } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (typeof imageIndex !== 'number' || imageIndex < 0) {
        throw new BadRequestError('El campo "imageIndex" debe ser un número válido');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const updatedProduct = await this.adminProductService.reorderImages(
        id,
        imageIndex,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(updatedProduct));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/products/:id/images
   * Subir imagen propia a S3 y agregarla al producto
   */
  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const file = req.file;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!file) {
        throw new BadRequestError('Archivo de imagen requerido');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      // Subir a S3
      const s3Service = new S3Service();
      const imageUrl = await s3Service.uploadFileForProducts(file);

      // Agregar al producto
      const product = await this.adminProductService.addImage(
        id,
        imageUrl,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(product));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/admin/products/:id/images
   * Eliminar imagen propia (elimina de S3 y del array)
   */
  deleteImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { imageUrl } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new BadRequestError('imageUrl es requerido y debe ser un string');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const product = await this.adminProductService.deleteCustomImage(
        id,
        imageUrl,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(product));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/products/:id/images/hide
   * Bloquear imagen (Dropi o custom)
   */
  hideImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { imageUrl } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new BadRequestError('imageUrl es requerido y debe ser un string');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const product = await this.adminProductService.hideImage(
        id,
        imageUrl,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(product));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/products/:id/images/show
   * Desbloquear imagen
   */
  showImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { imageUrl } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new BadRequestError('imageUrl es requerido y debe ser un string');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const product = await this.adminProductService.showImage(
        id,
        imageUrl,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(product));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/products/:id/apply-price-formula
   * Aplicar fórmula de precio a un producto
   */
  applyPriceFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { formulaId } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!formulaId || typeof formulaId !== 'string') {
        throw new BadRequestError('formulaId es requerido y debe ser un string');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const product = await this.adminProductService.applyPriceFormula(
        id,
        formulaId,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(product));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/products/bulk/update-category
   * Actualizar categoría de múltiples productos en masa
   */
  bulkUpdateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds, categoryId } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new BadRequestError('productIds debe ser un array con al menos un ID');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const result = await this.adminProductService.bulkUpdateCategory(
        productIds,
        categoryId || null,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/products/bulk/apply-price-formula
   * Aplicar fórmula de precio a múltiples productos en masa
   */
  bulkApplyPriceFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds, formulaId } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new BadRequestError('productIds debe ser un array con al menos un ID');
      }

      if (!formulaId || typeof formulaId !== 'string') {
        throw new BadRequestError('formulaId es requerido y debe ser un string');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const result = await this.adminProductService.bulkApplyPriceFormula(
        productIds,
        formulaId,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/products/bulk/toggle-active
   * Cambiar estado activo/inactivo de múltiples productos en masa
   */
  bulkToggleActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds, active } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new BadRequestError('productIds debe ser un array con al menos un ID');
      }

      if (typeof active !== 'boolean') {
        throw new BadRequestError('El campo "active" debe ser un booleano');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const result = await this.adminProductService.bulkToggleActive(
        productIds,
        active,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/products/bulk/toggle-lock
   * Bloquear/desbloquear múltiples productos en masa
   */
  bulkToggleLock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds, locked } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new BadRequestError('productIds debe ser un array con al menos un ID');
      }

      if (typeof locked !== 'boolean') {
        throw new BadRequestError('El campo "locked" debe ser un booleano');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      const result = await this.adminProductService.bulkToggleLock(
        productIds,
        locked,
        requestWithAdmin.adminUser.id
      );

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };
}


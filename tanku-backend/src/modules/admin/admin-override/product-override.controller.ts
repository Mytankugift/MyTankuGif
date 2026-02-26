import { Request, Response, NextFunction } from 'express';
import { ProductOverrideService } from './product-override.service';
import { BadRequestError, ForbiddenError } from '../../../shared/errors/AppError';
import { successResponse } from '../../../shared/response';
import { RequestWithAdminUser } from '../../../shared/types';

export class ProductOverrideController {
  private productOverrideService: ProductOverrideService;

  constructor() {
    this.productOverrideService = new ProductOverrideService();
  }

  /**
   * POST /api/v1/admin/products/:id/lock
   * Bloquear producto completo
   */
  lockProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      await this.productOverrideService.lockProduct(id, requestWithAdmin.adminUser.id);
      res.status(200).json(successResponse({ message: 'Producto bloqueado correctamente' }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/products/:id/unlock
   * Desbloquear producto (solo SUPER_ADMIN)
   */
  unlockProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const requestWithAdmin = req as RequestWithAdminUser;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      if (!requestWithAdmin.adminUser) {
        throw new BadRequestError('Usuario admin no encontrado');
      }

      // Solo SUPER_ADMIN puede desbloquear
      if (requestWithAdmin.adminUser.role !== 'SUPER_ADMIN') {
        throw new ForbiddenError('Solo SUPER_ADMIN puede desbloquear productos');
      }

      await this.productOverrideService.unlockProduct(id, requestWithAdmin.adminUser.id);
      res.status(200).json(successResponse({ message: 'Producto desbloqueado correctamente' }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/products/:id/lock-info
   * Obtener información del bloqueo
   */
  getLockInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('ID de producto es requerido');
      }

      const lockInfo = await this.productOverrideService.getLockInfo(id);
      res.status(200).json(successResponse(lockInfo));
    } catch (error) {
      next(error);
    }
  };
}



import { Request, Response, NextFunction } from 'express';
import { AdminPriceFormulaService, CreatePriceFormulaInput, UpdatePriceFormulaInput } from './admin-price-formulas.service';
import { BadRequestError } from '../../../shared/errors/AppError';
import { successResponse } from '../../../shared/response';
import { RequestWithAdminUser } from '../../../shared/types';

export class AdminPriceFormulaController {
  private priceFormulaService: AdminPriceFormulaService;

  constructor() {
    this.priceFormulaService = new AdminPriceFormulaService();
  }

  /**
   * GET /api/v1/admin/price-formulas
   * Listar todas las fórmulas de precio
   */
  getPriceFormulas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const formulas = await this.priceFormulaService.getPriceFormulas();
      res.status(200).json(successResponse(formulas));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/price-formulas/:id
   * Obtener fórmula por ID
   */
  getPriceFormulaById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('ID de fórmula es requerido');
      }

      const formula = await this.priceFormulaService.getPriceFormulaById(id);
      res.status(200).json(successResponse(formula));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/price-formulas
   * Crear nueva fórmula de precio
   */
  createPriceFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, type, value, description, isDefault } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;
      const userRole = requestWithAdmin.adminUser?.role;

      if (!name || !type || !value) {
        throw new BadRequestError('Los campos name, type y value son requeridos');
      }

      const input: CreatePriceFormulaInput = {
        name,
        type,
        value,
        description: description || null,
        isDefault: isDefault || false,
      };

      const formula = await this.priceFormulaService.createPriceFormula(input, userRole);
      res.status(201).json(successResponse(formula));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/price-formulas/:id
   * Actualizar fórmula de precio
   */
  updatePriceFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, type, value, description, isDefault } = req.body;
      const requestWithAdmin = req as RequestWithAdminUser;
      const userRole = requestWithAdmin.adminUser?.role;

      if (!id) {
        throw new BadRequestError('ID de fórmula es requerido');
      }

      const input: UpdatePriceFormulaInput = {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value }),
        ...(description !== undefined && { description }),
        ...(isDefault !== undefined && { isDefault }),
      };

      const formula = await this.priceFormulaService.updatePriceFormula(id, input, userRole);
      res.status(200).json(successResponse(formula));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/admin/price-formulas/:id
   * Eliminar fórmula de precio
   */
  deletePriceFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('ID de fórmula es requerido');
      }

      await this.priceFormulaService.deletePriceFormula(id);
      res.status(200).json(successResponse({ message: 'Fórmula eliminada correctamente' }));
    } catch (error) {
      next(error);
    }
  };
}


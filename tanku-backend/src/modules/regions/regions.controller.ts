import { Request, Response, NextFunction } from 'express';
import { RegionsService } from './regions.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { NotFoundError } from '../../shared/errors/AppError';

export class RegionsController {
  private regionsService: RegionsService;

  constructor() {
    this.regionsService = new RegionsService();
  }

  /**
   * GET /api/v1/regions
   * Listar todas las regiones disponibles
   */
  listRegions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const regions = await this.regionsService.listRegions();

      res.status(200).json(successResponse(regions));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/regions/:id
   * Obtener región por ID
   */
  getRegionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const region = await this.regionsService.getRegionById(id);

      if (!region) {
        throw new NotFoundError('Región no encontrada');
      }

      res.status(200).json(successResponse(region));
    } catch (error) {
      next(error);
    }
  };
}


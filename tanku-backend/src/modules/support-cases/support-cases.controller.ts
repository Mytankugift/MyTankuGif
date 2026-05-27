import { Request, Response, NextFunction } from 'express';
import { SupportCasesService } from './support-cases.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { successResponse } from '../../shared/response';
import { CreateSupportCaseInput } from '../../shared/dto/support-cases.dto';

export class SupportCasesController {
  private supportCasesService = new SupportCasesService();

  createCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('Usuario no autenticado');
      }

      const { orderId, orderItemId, caseType, description } = req.body;

      if (!orderId || !caseType || !description) {
        throw new BadRequestError('orderId, caseType y description son requeridos');
      }

      const input: CreateSupportCaseInput = {
        orderId,
        orderItemId: orderItemId ?? null,
        caseType,
        description,
      };

      const created = await this.supportCasesService.createCase(userId, input);
      res.status(201).json(successResponse(created));
    } catch (error) {
      next(error);
    }
  };

  listCases = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('Usuario no autenticado');
      }

      const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
      const cases = await this.supportCasesService.listCasesForUser(userId, orderId);
      res.status(200).json(successResponse(cases));
    } catch (error) {
      next(error);
    }
  };

  getCaseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('Usuario no autenticado');
      }

      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('ID de solicitud es requerido');
      }

      const detail = await this.supportCasesService.getCaseByIdForUser(id, userId);
      res.status(200).json(successResponse(detail));
    } catch (error) {
      next(error);
    }
  };
}

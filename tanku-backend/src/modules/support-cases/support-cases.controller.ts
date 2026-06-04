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

      const orderId = req.body.orderId;
      const orderItemId = req.body.orderItemId;
      const caseType = req.body.caseType;
      const description = req.body.description;
      const contactPhone = req.body.contactPhone;

      if (!orderId || !caseType || !description || !contactPhone) {
        throw new BadRequestError(
          'orderId, caseType, description y contactPhone son requeridos'
        );
      }

      const input: CreateSupportCaseInput = {
        orderId: String(orderId),
        orderItemId: orderItemId ? String(orderItemId) : null,
        caseType: String(caseType) as CreateSupportCaseInput['caseType'],
        description: String(description),
        contactPhone: String(contactPhone),
      };

      const files = (req.files as Express.Multer.File[]) || [];
      const created = await this.supportCasesService.createCase(userId, input, files);
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

  addUserReply = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('Usuario no autenticado');
      }

      const { id } = req.params;
      const message = req.body.message;
      if (!id) {
        throw new BadRequestError('ID de solicitud es requerido');
      }
      if (!message || typeof message !== 'string') {
        throw new BadRequestError('message es requerido');
      }

      const detail = await this.supportCasesService.addUserReply(id, userId, { message });
      res.status(200).json(successResponse(detail));
    } catch (error) {
      next(error);
    }
  };
}

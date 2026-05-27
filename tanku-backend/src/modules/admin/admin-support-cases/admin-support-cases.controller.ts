import { Request, Response, NextFunction } from 'express';
import { SupportCasesService } from '../../support-cases/support-cases.service';
import { BadRequestError } from '../../../shared/errors/AppError';
import { successResponse, errorResponse, ErrorCode } from '../../../shared/response';
import {
  ListSupportCasesAdminQuery,
  SupportCaseStatusDTO,
  SupportCaseTypeDTO,
  UpdateSupportCaseStatusInput,
} from '../../../shared/dto/support-cases.dto';
import { RequestWithAdminUser } from '../../../shared/types';

export class AdminSupportCasesController {
  private supportCasesService = new SupportCasesService();

  listCases = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: ListSupportCasesAdminQuery = {
        status: req.query.status as SupportCaseStatusDTO | undefined,
        caseType: req.query.caseType as SupportCaseTypeDTO | undefined,
        orderId: typeof req.query.orderId === 'string' ? req.query.orderId : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
      };

      const cases = await this.supportCasesService.listCasesAdmin(query);
      res.status(200).json(successResponse(cases));
    } catch (error) {
      next(error);
    }
  };

  getCaseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('ID de solicitud es requerido');
      }

      const detail = await this.supportCasesService.getCaseByIdAdmin(id);
      res.status(200).json(successResponse(detail));
    } catch (error) {
      next(error);
    }
  };

  updateCaseStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        throw new BadRequestError('ID de solicitud es requerido');
      }
      if (!status || typeof status !== 'string') {
        throw new BadRequestError('status es requerido');
      }

      const input: UpdateSupportCaseStatusInput = { status: status as SupportCaseStatusDTO };
      const updated = await this.supportCasesService.updateCaseStatusAdmin(
        id,
        requestWithAdmin.adminUser.id,
        input
      );

      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };
}

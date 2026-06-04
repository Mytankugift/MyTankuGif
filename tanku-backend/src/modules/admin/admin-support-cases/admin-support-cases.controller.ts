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
      const requestWithAdmin = req as RequestWithAdminUser;
      const assignedToRaw =
        typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined;

      let assignedTo: ListSupportCasesAdminQuery['assignedTo'];
      if (assignedToRaw === 'me') {
        if (!requestWithAdmin.adminUser) {
          return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
        }
        assignedTo = requestWithAdmin.adminUser.id;
      } else if (assignedToRaw === 'unassigned') {
        assignedTo = 'unassigned';
      } else if (assignedToRaw) {
        assignedTo = assignedToRaw;
      }

      const query: ListSupportCasesAdminQuery = {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        caseType: typeof req.query.caseType === 'string' ? req.query.caseType : undefined,
        orderId: typeof req.query.orderId === 'string' ? req.query.orderId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
        assignedTo,
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

  takeCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');

      const updated = await this.supportCasesService.takeCaseAdmin(
        id,
        requestWithAdmin.adminUser.id
      );
      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };

  startReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');

      const updated = await this.supportCasesService.startReviewAdmin(
        id,
        requestWithAdmin.adminUser.id
      );
      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };

  waitForUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');

      const updated = await this.supportCasesService.waitForUserAdmin(
        id,
        requestWithAdmin.adminUser.id
      );
      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };

  addMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      const { message } = req.body;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');
      if (!message || typeof message !== 'string') {
        throw new BadRequestError('message es requerido');
      }

      const updated = await this.supportCasesService.addPublicMessageAdmin(
        id,
        requestWithAdmin.adminUser.id,
        { message }
      );
      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      const { note } = req.body;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');
      if (!note || typeof note !== 'string') {
        throw new BadRequestError('note es requerido');
      }

      const updated = await this.supportCasesService.addInternalNoteAdmin(
        id,
        requestWithAdmin.adminUser.id,
        { note }
      );
      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };

  resolveCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');

      const acknowledgeNoReply = req.body?.acknowledgeNoReply === true;
      const updated = await this.supportCasesService.resolveCaseAdmin(
        id,
        requestWithAdmin.adminUser.id,
        { acknowledgeNoReply }
      );
      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };

  closeCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');

      const updated = await this.supportCasesService.closeCaseAdmin(
        id,
        requestWithAdmin.adminUser.id
      );
      res.status(200).json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  };

  previewDropi = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const orderItemId =
        typeof req.query.orderItemId === 'string' ? req.query.orderItemId : undefined;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');

      const preview = await this.supportCasesService.previewDropiAdmin(id, orderItemId);
      res.status(200).json(successResponse(preview));
    } catch (error) {
      next(error);
    }
  };

  refreshDropi = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithAdmin = req as RequestWithAdminUser;
      if (!requestWithAdmin.adminUser) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }
      const { id } = req.params;
      if (!id) throw new BadRequestError('ID de solicitud es requerido');

      const updated = await this.supportCasesService.refreshDropiAdmin(
        id,
        requestWithAdmin.adminUser.id
      );
      res.status(200).json(successResponse(updated));
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

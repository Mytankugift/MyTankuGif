import { Request, Response, NextFunction } from 'express';
import { ConsentService } from './consent.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';
import { BadRequestError } from '../../shared/errors/AppError';

export class ConsentController {
  private consentService: ConsentService;

  constructor() {
    this.consentService = new ConsentService();
  }

  /**
   * POST /api/v1/consent
   * Guardar consentimiento del usuario
   */
  saveConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autorizado'));
      }

      const { consentType, policyVersion } = req.body;

      if (!consentType || !policyVersion) {
        throw new BadRequestError('consentType y policyVersion son requeridos');
      }

      const ipAddress = this.consentService.getIpFromRequest(req);
      
      await this.consentService.saveConsent(
        requestWithUser.user.id,
        { consentType, policyVersion },
        ipAddress
      );

      res.status(200).json(successResponse({ success: true }));
    } catch (error) {
      next(error);
    }
  };
}


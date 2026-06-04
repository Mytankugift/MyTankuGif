import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../shared/errors/AppError';
import { successResponse } from '../../shared/response';
import {
  SupportCasesConfigService,
} from '../support-cases/support-cases-config.service';

const configService = new SupportCasesConfigService();

export class AdminSupportCasesConfigController {
  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await configService.getConfig();
      res.status(200).json(successResponse(config));
    } catch (error) {
      next(error);
    }
  };

  patchConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notificationEmail } = req.body ?? {};
      if (
        notificationEmail !== undefined &&
        notificationEmail !== null &&
        typeof notificationEmail !== 'string'
      ) {
        throw new BadRequestError('notificationEmail debe ser un string o null');
      }

      try {
        await configService.saveConfig({ notificationEmail });
        const config = await configService.getConfig();
        res.status(200).json(
          successResponse({
            ...config,
            message: 'Configuración de postventa guardada',
          })
        );
      } catch (err) {
        if (err instanceof Error && err.message.includes('inválido')) {
          throw new BadRequestError(err.message);
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  };
}

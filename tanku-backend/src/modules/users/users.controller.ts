import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { RequestWithUser } from '../../shared/types';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  /**
   * GET /personal-info/get-info?customer_id=...
   * Obtener información personal completa
   */
  getPersonalInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customer_id } = req.query;

      if (!customer_id || typeof customer_id !== 'string') {
        throw new BadRequestError('customer_id es requerido');
      }

      const personalInfo = await this.usersService.getPersonalInfo(customer_id);

      res.status(200).json({
        success: true,
        data: personalInfo,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /personal-info/update-pseudonym
   * Actualizar seudónimo
   */
  updatePseudonym = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customer_id, pseudonym } = req.body;

      if (!customer_id) {
        throw new BadRequestError('customer_id es requerido');
      }

      if (pseudonym === undefined || pseudonym === null) {
        throw new BadRequestError('pseudonym es requerido');
      }

      const personalInfo = await this.usersService.updatePseudonym(customer_id, pseudonym);

      res.status(200).json({
        success: true,
        message: 'Seudónimo actualizado exitosamente',
        data: {
          pseudonym,
          personal_info: personalInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /personal-info/update-status
   * Actualizar mensaje de estado
   */
  updateStatusMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customer_id, status_message } = req.body;

      if (!customer_id) {
        throw new BadRequestError('customer_id es requerido');
      }

      if (status_message === undefined || status_message === null) {
        throw new BadRequestError('status_message es requerido');
      }

      const personalInfo = await this.usersService.updateStatusMessage(customer_id, status_message);

      res.status(200).json({
        success: true,
        message: 'Mensaje de estado actualizado exitosamente',
        data: {
          status_message,
          personal_info: personalInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /personal-info/update-avatar
   * Actualizar avatar (upload de archivo)
   */
  updateAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      const { customer_id } = req.body;

      if (!customer_id) {
        throw new BadRequestError('customer_id es requerido');
      }

      if (!file) {
        throw new BadRequestError('Se requiere una imagen de avatar');
      }

      // Subir archivo a S3
      const { S3Service } = await import('../../shared/services/s3.service');
      const s3Service = new S3Service();
      const avatarUrl = await s3Service.uploadFile(file, 'avatars');

      // Actualizar en la base de datos
      const personalInfo = await this.usersService.updateAvatar(customer_id, avatarUrl);

      res.status(200).json({
        success: true,
        message: 'Avatar actualizado exitosamente',
        data: {
          avatar_url: avatarUrl,
          personal_info: personalInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /personal-info/update-banner
   * Actualizar banner (upload de archivo)
   */
  updateBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      const { customer_id } = req.body;

      if (!customer_id) {
        throw new BadRequestError('customer_id es requerido');
      }

      if (!file) {
        throw new BadRequestError('Se requiere una imagen de banner');
      }

      // Subir archivo a S3
      const { S3Service } = await import('../../shared/services/s3.service');
      const s3Service = new S3Service();
      const bannerUrl = await s3Service.uploadFile(file, 'banners');

      // Actualizar en la base de datos
      const personalInfo = await this.usersService.updateBanner(customer_id, bannerUrl);

      res.status(200).json({
        success: true,
        message: 'Banner actualizado exitosamente',
        data: {
          banner_url: bannerUrl,
          personal_info: personalInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

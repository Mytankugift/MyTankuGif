import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { RequestWithUser } from '../../shared/types';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import {
  CreateAddressDTO,
  UpdateAddressDTO,
  UpdateUserDTO,
  UpdateUserProfileDTO,
  UpdatePersonalInformationDTO,
  UpdateOnboardingDataDTO,
} from '../../shared/dto/users.dto';

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

  /**
   * GET /api/v1/users/me
   * Obtener usuario actual con direcciones (NUEVO - Normalizado)
   */
  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const result = await this.usersService.getCurrentUserWithAddresses(requestWithUser.user.id);

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/users/me
   * Actualizar información del usuario (NUEVO - Normalizado)
   */
  updateCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const updateData: UpdateUserDTO = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        email: req.body.email,
        username: req.body.username,
      };

      // Validar que al menos un campo esté presente
      const hasField = updateData.firstName !== undefined || 
                      updateData.lastName !== undefined || 
                      updateData.phone !== undefined || 
                      updateData.email !== undefined || 
                      updateData.username !== undefined;
      
      if (!hasField) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'Al menos un campo debe ser proporcionado para actualizar'));
      }

      const user = await this.usersService.updateUser(requestWithUser.user.id, updateData);

      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users/me/addresses
   * Obtener direcciones del usuario (NUEVO - Normalizado)
   */
  getUserAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const addresses = await this.usersService.getUserAddresses(requestWithUser.user.id);

      res.status(200).json(successResponse(addresses));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/users/me/addresses
   * Crear dirección para el usuario (NUEVO - Normalizado)
   */
  createUserAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const addressData: CreateAddressDTO = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        address1: req.body.address1,
        address2: req.body.address2,
        city: req.body.city,
        state: req.body.state,
        postalCode: req.body.postalCode,
        country: req.body.country || 'CO',
        isDefaultShipping: req.body.isDefaultShipping,
        metadata: req.body.metadata,
      };

      // Validar campos requeridos
      if (!addressData.firstName || !addressData.lastName || !addressData.address1 || !addressData.city || !addressData.state || !addressData.postalCode) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'Campos requeridos: firstName, lastName, address1, city, state, postalCode'));
      }

      const address = await this.usersService.createUserAddress(requestWithUser.user.id, addressData);

      res.status(201).json(successResponse(address));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/users/me/addresses/:addressId
   * Actualizar dirección del usuario (NUEVO - Normalizado)
   */
  updateUserAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { addressId } = req.params;
      const addressData: UpdateAddressDTO = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        address1: req.body.address1,
        address2: req.body.address2,
        city: req.body.city,
        state: req.body.state,
        postalCode: req.body.postalCode,
        country: req.body.country,
        isDefaultShipping: req.body.isDefaultShipping,
        metadata: req.body.metadata,
      };

      const address = await this.usersService.updateUserAddress(requestWithUser.user.id, addressId, addressData);

      res.status(200).json(successResponse(address));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/users/me/addresses/:addressId
   * Eliminar dirección del usuario (NUEVO - Normalizado)
   */
  deleteUserAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { addressId } = req.params;

      await this.usersService.deleteUserAddress(requestWithUser.user.id, addressId);

      res.status(200).json(successResponse({ message: 'Dirección eliminada exitosamente' }));
    } catch (error) {
      next(error);
    }
  };

  // ==================== USER PROFILE ENDPOINTS ====================

  /**
   * GET /api/v1/users/me/profile
   * Obtener perfil del usuario autenticado
   */
  getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const profile = await this.usersService.getUserProfile(requestWithUser.user.id);

      res.status(200).json(successResponse(profile));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/users/me/profile
   * Actualizar perfil del usuario autenticado (bio)
   */
  updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const updateData: UpdateUserProfileDTO = {
        bio: req.body.bio !== undefined ? req.body.bio : undefined,
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : undefined,
        allowPublicWishlistsWhenPrivate: req.body.allowPublicWishlistsWhenPrivate !== undefined ? req.body.allowPublicWishlistsWhenPrivate : undefined,
        allowGiftShipping: req.body.allowGiftShipping !== undefined ? req.body.allowGiftShipping : undefined,
        useMainAddressForGifts: req.body.useMainAddressForGifts !== undefined ? req.body.useMainAddressForGifts : undefined,
        socialLinks: req.body.socialLinks !== undefined ? req.body.socialLinks : undefined,
      };

      const profile = await this.usersService.upsertUserProfile(requestWithUser.user.id, updateData);

      res.status(200).json(successResponse(profile));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/users/me/profile/avatar
   * Actualizar avatar del usuario autenticado (upload de archivo)
   */
  updateUserProfileAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'Se requiere una imagen de avatar'));
      }

      // Subir archivo a S3
      const { S3Service } = await import('../../shared/services/s3.service');
      const s3Service = new S3Service();
      const avatarUrl = await s3Service.uploadFile(file, 'avatars');

      // Actualizar en la base de datos
      const profile = await this.usersService.updateUserProfileAvatar(requestWithUser.user.id, avatarUrl);

      res.status(200).json(successResponse(profile));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/users/me/profile/banner
   * Actualizar banner del usuario autenticado (upload de archivo)
   */
  updateUserProfileBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'Se requiere una imagen de banner'));
      }

      // Subir archivo a S3
      const { S3Service } = await import('../../shared/services/s3.service');
      const s3Service = new S3Service();
      const bannerUrl = await s3Service.uploadFile(file, 'banners');

      // Actualizar en la base de datos
      const profile = await this.usersService.updateUserProfileBanner(requestWithUser.user.id, bannerUrl);

      res.status(200).json(successResponse(profile));
    } catch (error) {
      next(error);
    }
  };

  // ==================== PERSONAL INFORMATION ENDPOINTS ====================

  /**
   * GET /api/v1/users/me/personal-info
   * Obtener información personal del usuario autenticado
   */
  getPersonalInformation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const personalInfo = await this.usersService.getPersonalInformation(requestWithUser.user.id);

      res.status(200).json(successResponse(personalInfo));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/users/me/personal-info
   * Actualizar información personal del usuario autenticado
   */
  updatePersonalInformation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const updateData: UpdatePersonalInformationDTO = {
        pseudonym: req.body.pseudonym,
        statusMessage: req.body.statusMessage,
      };

      const personalInfo = await this.usersService.upsertPersonalInformation(requestWithUser.user.id, updateData);

      res.status(200).json(successResponse(personalInfo));
    } catch (error) {
      next(error);
    }
  };

  // ==================== ONBOARDING STATUS ENDPOINTS ====================

  /**
   * GET /api/v1/users/me/onboarding-data
   * Obtener datos de onboarding del usuario autenticado
   */
  getOnboardingData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const onboardingData = await this.usersService.getOnboardingData(requestWithUser.user.id);

      res.status(200).json(successResponse(onboardingData));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/users/me/onboarding-data
   * Actualizar datos de onboarding del usuario autenticado
   */
  updateOnboardingData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const updateData: UpdateOnboardingDataDTO = req.body;

      console.log(`🔄 [USERS] Actualizando datos de onboarding para usuario ${requestWithUser.user.id}`);

      try {
        const onboardingData = await this.usersService.updateOnboardingData(
          requestWithUser.user.id,
          updateData
        );

        res.status(200).json(successResponse(onboardingData));
      } catch (error: any) {
        // Si hay error de foreign key, el usuario no existe
        if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint') || error?.message?.includes('Usuario no encontrado')) {
          console.error(`❌ [USERS] Usuario ${requestWithUser.user.id} no existe en la base de datos. Token válido pero usuario eliminado.`);
          console.error(`   Error:`, error?.message);
          return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'Usuario no encontrado. Por favor, inicia sesión nuevamente.'));
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users/search?q=...
   * Buscar usuarios para autocompletado de menciones
   */
  searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      const limit = parseInt(req.query.limit as string) || 10;
      const requestWithUser = req as RequestWithUser;
      const viewerUserId = requestWithUser.user?.id;

      // Permitir query vacío para mostrar usuarios recientes
      const query = typeof q === 'string' ? q : '';

      const users = await this.usersService.searchUsers(query, limit, viewerUserId);

      res.status(200).json(successResponse(users));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/users/by-ids
   * Obtener usuarios por IDs (para menciones)
   */
  getUsersByIds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'userIds debe ser un array no vacío',
          },
        });
      }

      const users = await this.usersService.getUsersByIds(userIds);

      res.status(200).json(successResponse({ users }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users/:userId
   * Obtener información de usuario por ID considerando privacidad
   */
  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const requestWithUser = req as RequestWithUser;
      const viewerUserId = requestWithUser.user?.id;

      if (!userId) {
        throw new BadRequestError('userId es requerido');
      }

      const user = await this.usersService.getUserById(userId, viewerUserId);

      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users/by-username/:username
   * Obtener información de usuario por username considerando privacidad
   */
  getUserByUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.params;
      const requestWithUser = req as RequestWithUser;
      const viewerUserId = requestWithUser.user?.id;

      if (!username) {
        throw new BadRequestError('username es requerido');
      }

      const user = await this.usersService.getUserByUsername(username, viewerUserId);

      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/users/me/account
   * Eliminar cuenta de usuario
   * - Anonimiza órdenes (mantiene para razones legales/financieras)
   * - Preserva conversaciones para otros participantes
   * - Elimina grupos donde el usuario es dueño
   * - Elimina archivos S3 (avatar, banner, posters, stories)
   * - Elimina usuario y todos sus datos relacionados
   */
  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const userId = requestWithUser.user?.id;

      if (!userId) {
        throw new BadRequestError('Usuario no autenticado');
      }

      await this.usersService.deleteUserAccount(userId);

      res.status(200).json(
        successResponse({
          message: 'Cuenta eliminada exitosamente',
        })
      );
    } catch (error) {
      next(error);
    }
  };
}

/**
 * StalkerGift Controller
 * 
 * Controlador para gestionar regalos anónimos (StalkerGift)
 */

import { Request, Response } from 'express';
import { StalkerGiftService } from './stalker-gift.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';

export class StalkerGiftController {
  private stalkerGiftService: StalkerGiftService;

  constructor() {
    this.stalkerGiftService = new StalkerGiftService();
  }

  /**
   * POST /api/v1/stalker-gift
   * Crear un nuevo StalkerGift
   */
  createStalkerGift = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const {
        receiverId,
        externalReceiverData,
        productId,
        variantId,
        quantity,
        senderAlias,
        senderMessage,
      } = req.body;

      const stalkerGift = await this.stalkerGiftService.createStalkerGift({
        senderId: userId,
        receiverId,
        externalReceiverData,
        productId,
        variantId,
        quantity: quantity || 1,
        senderAlias,
        senderMessage,
      });

      return res.status(201).json(successResponse(stalkerGift));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/stalker-gift/public/:token
   * Obtener StalkerGift por token (público, para página de aceptación)
   */
  getStalkerGiftByToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'Token es requerido'));
      }

      const stalkerGift = await this.stalkerGiftService.getStalkerGiftByToken(token);

      return res.status(200).json(successResponse(stalkerGift));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/stalker-gift/:id
   * Obtener StalkerGift por ID (con validación de acceso)
   */
  getStalkerGiftById = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      const stalkerGift = await this.stalkerGiftService.getStalkerGiftById(id, userId);

      return res.status(200).json(successResponse(stalkerGift));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/stalker-gift/sent
   * Obtener StalkerGifts enviados por el usuario
   */
  getStalkerGiftsBySender = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const stalkerGifts = await this.stalkerGiftService.getStalkerGiftsBySender(userId);

      return res.status(200).json(successResponse(stalkerGifts));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/stalker-gift/received
   * Obtener StalkerGifts recibidos por el usuario
   */
  getStalkerGiftsByReceiver = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const stalkerGifts = await this.stalkerGiftService.getStalkerGiftsByReceiver(userId);

      return res.status(200).json(successResponse(stalkerGifts));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * POST /api/v1/stalker-gift/:id/accept
   * Aceptar un StalkerGift
   */
  acceptStalkerGift = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { addressId } = req.body;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      if (!addressId) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'addressId es requerido'));
      }

      const stalkerGift = await this.stalkerGiftService.acceptStalkerGift(id, userId, addressId);

      return res.status(200).json(successResponse(stalkerGift));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * POST /api/v1/stalker-gift/:id/reject
   * Rechazar un StalkerGift
   */
  rejectStalkerGift = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      const stalkerGift = await this.stalkerGiftService.rejectStalkerGift(id, userId);

      return res.status(200).json(successResponse(stalkerGift));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * POST /api/v1/stalker-gift/:id/cancel
   * Cancelar un StalkerGift (solo el sender puede cancelar)
   */
  cancelStalkerGift = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      const stalkerGift = await this.stalkerGiftService.cancelStalkerGift(id, userId);

      return res.status(200).json(successResponse(stalkerGift));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * POST /api/v1/stalker-gift/:id/generate-link
   * Generar link único para aceptación (usado después del pago)
   */
  generateUniqueLink = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      // Validar que el usuario es el sender
      const stalkerGift = await this.stalkerGiftService.getStalkerGiftById(id, userId);
      if (stalkerGift.senderId !== userId) {
        return res
          .status(403)
          .json(errorResponse(ErrorCode.FORBIDDEN, 'Solo el remitente puede generar el link'));
      }

      const link = await this.stalkerGiftService.generateUniqueLink(id);

      return res.status(200).json(successResponse({ link }));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * POST /api/v1/stalker-gift/:id/reveal-identity
   * Revelar identidad en el chat anónimo
   */
  revealIdentityInChat = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      await this.stalkerGiftService.revealIdentityInChat(id, userId);

      return res.status(200).json(successResponse({ success: true }));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/stalker-gift/:id/can-view-profile
   * Verificar si el usuario puede ver el perfil del otro
   */
  canViewProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      const canView = await this.stalkerGiftService.canViewProfile(id, userId);

      return res.status(200).json(successResponse({ canViewProfile: canView }));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/stalker-gift/:id/profile-visibility
   * Obtener información detallada de visibilidad del perfil
   */
  getProfileVisibilityInfo = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      const info = await this.stalkerGiftService.getProfileVisibilityInfo(id, userId);

      return res.status(200).json(successResponse(info));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/stalker-gift/:id/can-complete-acceptance
   * Verificar si el usuario puede completar la aceptación (tiene dirección)
   */
  canCompleteAcceptance = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      const info = await this.stalkerGiftService.canCompleteAcceptance(id, userId);

      return res.status(200).json(successResponse(info));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * POST /api/v1/stalker-gift/checkout
   * Checkout StalkerGift - Preparar datos para ePayco
   */
  checkout = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const {
        receiverId,
        externalReceiverData,
        productId,
        variantId,
        quantity,
        senderAlias,
        senderMessage,
      } = req.body;

      if (!productId || !senderAlias) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'productId y senderAlias son requeridos'));
      }

      if (!receiverId && !externalReceiverData) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'Debes especificar un receptor (receiverId o externalReceiverData)'));
      }

      const result = await this.stalkerGiftService.checkoutStalkerGift({
        senderId: userId,
        receiverId,
        externalReceiverData,
        productId,
        variantId,
        quantity: quantity || 1,
        senderAlias,
        senderMessage,
      });

      return res.status(200).json(successResponse({
        stalkerGiftId: result.stalkerGiftId,
        cartId: result.cartId, // Incluir cartId para ePayco
        total: result.total,
        subtotal: result.subtotal,
        shippingTotal: result.shippingTotal,
        paymentMethod: 'epayco',
        message: 'StalkerGift creado. Procede con el pago en ePayco.',
      }));
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };
}


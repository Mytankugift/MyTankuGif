/**
 * Friends Controller
 * 
 * Controller para gestionar relaciones de amistad entre usuarios
 */

import { Request, Response, NextFunction } from 'express';
import { FriendsService } from './friends.service';
import { RequestWithUser } from '../../shared/types';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import {
  CreateFriendRequestDTO,
  UpdateFriendRequestDTO,
} from '../../shared/dto/friends.dto';

export class FriendsController {
  private friendsService: FriendsService;

  constructor() {
    this.friendsService = new FriendsService();
  }

  /**
   * POST /api/v1/friends/requests
   * Enviar solicitud de amistad
   */
  sendFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const data: CreateFriendRequestDTO = req.body;

      if (!data.friendId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'friendId es requerido'));
      }

      const friendRequest = await this.friendsService.sendFriendRequest(
        requestWithUser.user.id,
        data
      );

      res.status(201).json(successResponse(friendRequest));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/friends/requests
   * Obtener solicitudes recibidas (pendientes)
   */
  getFriendRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const requests = await this.friendsService.getFriendRequests(requestWithUser.user.id);

      res.status(200).json(successResponse(requests));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/friends/requests/sent
   * Obtener solicitudes enviadas (pendientes)
   */
  getSentFriendRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const requests = await this.friendsService.getSentFriendRequests(requestWithUser.user.id);

      res.status(200).json(successResponse(requests));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/friends/requests/:id
   * Aceptar o rechazar solicitud de amistad
   */
  updateFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;
      const data: UpdateFriendRequestDTO = req.body;

      if (!data.status || !['accepted', 'rejected'].includes(data.status)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, 'status debe ser "accepted" o "rejected"'));
      }

      const updatedRequest = await this.friendsService.updateFriendRequest(
        id,
        requestWithUser.user.id,
        data
      );

      res.status(200).json(successResponse(updatedRequest));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/friends
   * Obtener lista de amigos (aceptados)
   */
  getFriends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const friends = await this.friendsService.getFriends(requestWithUser.user.id);
      const friendsCount = friends.length;

      res.status(200).json(successResponse({ friends, count: friendsCount }));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/friends/:friendId
   * Eliminar amigo
   */
  removeFriend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { friendId } = req.params;

      if (!friendId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'friendId es requerido'));
      }

      await this.friendsService.removeFriend(requestWithUser.user.id, friendId);

      res.status(200).json(successResponse({ message: 'Amigo eliminado exitosamente' }));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/friends/suggestions
   * Obtener sugerencias de amigos
   */
  getFriendSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const suggestions = await this.friendsService.getFriendSuggestions(
        requestWithUser.user.id,
        limit
      );

      res.status(200).json(successResponse(suggestions));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/friends/requests/:id
   * Cancelar solicitud enviada
   */
  cancelSentRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;

      await this.friendsService.cancelSentRequest(id, requestWithUser.user.id);

      res.status(200).json(successResponse({ message: 'Solicitud cancelada exitosamente' }));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/v1/friends/block
   * Bloquear usuario
   */
  blockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'userId es requerido'));
      }

      await this.friendsService.blockUser(requestWithUser.user.id, userId);

      res.status(200).json(successResponse({ message: 'Usuario bloqueado exitosamente' }));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/friends/block/:userId
   * Desbloquear usuario
   */
  unblockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'userId es requerido'));
      }

      await this.friendsService.unblockUser(requestWithUser.user.id, userId);

      res.status(200).json(successResponse({ message: 'Usuario desbloqueado exitosamente' }));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/friends/blocked
   * Obtener usuarios bloqueados
   */
  getBlockedUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const blockedUsers = await this.friendsService.getBlockedUsers(requestWithUser.user.id);

      res.status(200).json(successResponse(blockedUsers));
    } catch (error: any) {
      next(error);
    }
  };
}

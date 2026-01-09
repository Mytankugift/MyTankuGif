import { Request, Response, NextFunction } from 'express';
import { WishListsService } from './wishlists.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { BadRequestError } from '../../shared/errors/AppError';
import { RequestWithUser } from '../../shared/types';

export class WishListsController {
  private wishListsService: WishListsService;

  constructor() {
    this.wishListsService = new WishListsService();
  }

  /**
   * GET /api/v1/wishlists
   * Obtener wish lists del usuario autenticado
   */
  getUserWishLists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const wishLists = await this.wishListsService.getUserWishLists(requestWithUser.user.id);

      res.status(200).json(successResponse(wishLists));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/wishlists/:userId
   * Obtener wish lists de un usuario específico (para wishlists públicas)
   */
  getWishListsByUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new BadRequestError('userId es requerido');
      }

      const wishLists = await this.wishListsService.getUserWishLists(userId);

      // Filtrar solo wishlists públicas si no es el mismo usuario
      const requestWithUser = req as RequestWithUser;
      const isOwnWishLists = requestWithUser.user?.id === userId;

      const filteredWishLists = isOwnWishLists
        ? wishLists
        : wishLists.filter((list) => list.public);

      res.status(200).json(successResponse(filteredWishLists));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/wishlists
   * Crear nueva wish list
   */
  createWishList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { name, public: isPublic } = req.body;

      if (!name) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'El nombre es requerido'));
      }

      const wishList = await this.wishListsService.createWishList(
        requestWithUser.user.id,
        name,
        isPublic || false
      );

      res.status(201).json(successResponse(wishList));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/wishlists/:id
   * Actualizar wish list
   */
  updateWishList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;
      const { name, public: isPublic } = req.body;

      const wishList = await this.wishListsService.updateWishList(
        id,
        requestWithUser.user.id,
        name,
        isPublic
      );

      res.status(200).json(successResponse(wishList));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/wishlists/:id
   * Eliminar wish list
   */
  deleteWishList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;

      await this.wishListsService.deleteWishList(id, requestWithUser.user.id);

      res.status(200).json(successResponse({ message: 'Wish list eliminada exitosamente' }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/wishlists/:id/items
   * Agregar producto a wish list
   */
  addItemToWishList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;
      const { productId, variantId } = req.body;

      if (!productId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'productId es requerido'));
      }

      const item = await this.wishListsService.addItemToWishList(
        id,
        productId,
        requestWithUser.user.id,
        variantId
      );

      res.status(201).json(successResponse(item));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/wishlists/:id/items/:itemId
   * Remover producto de wish list
   */
  removeItemFromWishList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id, itemId } = req.params;

      await this.wishListsService.removeItemFromWishList(id, itemId, requestWithUser.user.id);

      res.status(200).json(successResponse({ message: 'Item removido exitosamente' }));
    } catch (error) {
      next(error);
    }
  };
}


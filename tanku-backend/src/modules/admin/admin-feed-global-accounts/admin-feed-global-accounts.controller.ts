import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../../shared/errors/AppError';
import { successResponse } from '../../../shared/response';
import { globalFeedAccountsService } from '../../feed-global-accounts/global-feed-accounts.service';
import { FeedService } from '../../feed/feed.service';

const feedService = new FeedService();

function invalidateFeedCaches(): void {
  globalFeedAccountsService.invalidateCache();
  feedService.invalidatePublicFeedCache();
}

export class AdminFeedGlobalAccountsController {
  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const accounts = await globalFeedAccountsService.listAll();
      res.status(200).json(successResponse(accounts));
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        throw new BadRequestError('El campo email es requerido');
      }
      const account = await globalFeedAccountsService.createByEmail(email);
      invalidateFeedCaches();
      res.status(201).json(successResponse(account));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('ID es requerido');
      }
      const { active, sortOrder } = req.body ?? {};
      const patch: { active?: boolean; sortOrder?: number } = {};
      if (active !== undefined) patch.active = Boolean(active);
      if (sortOrder !== undefined) {
        const n = Number(sortOrder);
        if (!Number.isFinite(n)) {
          throw new BadRequestError('sortOrder debe ser un número');
        }
        patch.sortOrder = n;
      }
      const account = await globalFeedAccountsService.update(id, patch);
      invalidateFeedCaches();
      res.status(200).json(successResponse(account));
    } catch (error) {
      next(error);
    }
  };
}

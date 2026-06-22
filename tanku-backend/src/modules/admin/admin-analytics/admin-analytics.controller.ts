import { Request, Response, NextFunction } from 'express';
import { AdminAnalyticsService } from './admin-analytics.service';
import { successResponse } from '../../../shared/response';
import { resolveRange } from './analytics-range.util';

export class AdminAnalyticsController {
  private analyticsService: AdminAnalyticsService;

  constructor() {
    this.analyticsService = new AdminAnalyticsService();
  }

  /**
   * GET /api/v1/admin/analytics/overview
   * KPIs de cabecera + comparación con el periodo anterior.
   */
  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getOverview(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/sales
   * Ventas, ingresos confirmados, ganancia y distribuciones.
   */
  getSales = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getSales(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/users
   * Crecimiento y composición de usuarios.
   */
  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getUsers(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/gifts
   * Métricas de regalos (StalkerGift).
   */
  getGifts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getGifts(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/support
   * Métricas de postventa (casos de soporte).
   */
  getSupport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getSupport(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/operations
   * Salud de la operación Dropi (jobs y crons).
   */
  getOperations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getOperations(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/catalog
   * Estado del catálogo e inventario.
   */
  getCatalog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getCatalog(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/social
   * Métricas de engagement social.
   */
  getSocial = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getSocial(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/analytics/behavior
   * Comportamiento (analytics_events): embudo, DAU/MAU, retención.
   */
  getBehavior = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = resolveRange(req.query);
      const data = await this.analyticsService.getBehavior(range);
      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };
}

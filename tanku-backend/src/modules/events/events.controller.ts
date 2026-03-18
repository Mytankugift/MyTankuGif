/**
 * Events Controller
 * 
 * Controlador para el módulo de eventos
 */

import { Request, Response, NextFunction } from 'express';
import { EventsService } from './events.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';
import { createEventSchema, updateEventSchema, getEventsSchema } from './events.schemas';

export class EventsController {
  private eventsService: EventsService;

  constructor() {
    this.eventsService = new EventsService();
  }

  /**
   * POST /api/v1/events
   * Crear un nuevo evento
   */
  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      // Validar con Zod
      const validation = createEventSchema.safeParse(req);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(ErrorCode.BAD_REQUEST, validation.error.errors[0].message)
        );
      }

      const event = await this.eventsService.createEvent(
        requestWithUser.user.id,
        validation.data.body
      );

      res.status(201).json(successResponse(event));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/events
   * Obtener eventos del usuario
   * Query params: month, year (para calendario) o sin params (todos los eventos)
   */
  getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { month, year } = req.query;

      // Si hay month y year, devolver eventos del calendario (con repeticiones calculadas)
      if (month && year) {
        const validation = getEventsSchema.safeParse(req);
        if (!validation.success) {
          return res.status(400).json(
            errorResponse(ErrorCode.BAD_REQUEST, validation.error.errors[0].message)
          );
        }

        const calendarEvents = await this.eventsService.getEventsForMonth(
          requestWithUser.user.id,
          validation.data.query.month!,
          validation.data.query.year!
        );

        return res.status(200).json(successResponse(calendarEvents));
      }

      // Si no hay month/year, devolver todos los eventos originales (sin repeticiones)
      const events = await this.eventsService.getUserEvents(requestWithUser.user.id);
      res.status(200).json(successResponse(events));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/events/:id
   * Obtener un evento específico por ID
   */
  getEventById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const { id } = req.params;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      if (!id) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      const event = await this.eventsService.getEventById(id, requestWithUser.user.id);
      res.status(200).json(successResponse(event));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/events/:id
   * Actualizar un evento
   */
  updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const { id } = req.params;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      if (!id) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      // Validar con Zod
      const validation = updateEventSchema.safeParse(req);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(ErrorCode.BAD_REQUEST, validation.error.errors[0].message)
        );
      }

      const event = await this.eventsService.updateEvent(
        id,
        requestWithUser.user.id,
        validation.data.body
      );

      res.status(200).json(successResponse(event));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/events/:id
   * Eliminar un evento
   */
  deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      const { id } = req.params;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      if (!id) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'ID es requerido'));
      }

      await this.eventsService.deleteEvent(id, requestWithUser.user.id);
      res.status(200).json(successResponse({ message: 'Evento eliminado correctamente' }));
    } catch (error) {
      next(error);
    }
  };
}


import { Request, Response } from 'express';
import { AnalyticsEventsService } from './analytics-events.service';
import { successResponse } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';
import { IngestBody } from './analytics-events.types';

export class AnalyticsEventsController {
  private service: AnalyticsEventsService;

  constructor() {
    this.service = new AnalyticsEventsService();
  }

  /**
   * POST /api/v1/analytics/events
   * Ingesta en lote de eventos de comportamiento. Auth opcional.
   * Responde 202 incluso si algún evento se descarta: la telemetría no debe
   * romper la app del usuario.
   */
  track = async (req: Request, res: Response) => {
    try {
      const userId = (req as RequestWithUser).user?.id ?? null;
      const body = (req.body ?? {}) as IngestBody;

      const sessionId =
        body.sessionId ?? (req.headers['x-session-id'] as string | undefined) ?? null;

      const accepted = await this.service.ingestBatch(body.events ?? [], {
        userId,
        sessionId,
      });

      return res.status(202).json(successResponse({ accepted }));
    } catch (error: any) {
      // Nunca propagar: degradar silenciosamente.
      console.error('[ANALYTICS-EVENTS] Error en ingesta:', error?.message);
      return res.status(202).json(successResponse({ accepted: 0 }));
    }
  };
}

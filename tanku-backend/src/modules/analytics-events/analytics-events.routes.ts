import { Router } from 'express';
import { AnalyticsEventsController } from './analytics-events.controller';
import { optionalAuthenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new AnalyticsEventsController();

/**
 * POST /api/v1/analytics/events
 * Ingesta de tracking de comportamiento (append-only). Auth opcional:
 * si hay sesión se atribuye el userId, si no, el evento es anónimo.
 * Ver _meta/tracking-eventos.md.
 */
router.post('/events', optionalAuthenticate, controller.track);

export default router;

/**
 * Events Routes
 * 
 * Rutas para el módulo de eventos
 */

import { Router } from 'express';
import { EventsController } from './events.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const eventsController = new EventsController();

// Crear evento
router.post('/', authenticate, eventsController.createEvent);

// Obtener eventos (con o sin filtros de mes/año)
router.get('/', authenticate, eventsController.getEvents);

// Obtener evento por ID
router.get('/:id', authenticate, eventsController.getEventById);

// Actualizar evento
router.put('/:id', authenticate, eventsController.updateEvent);

// Eliminar evento
router.delete('/:id', authenticate, eventsController.deleteEvent);

export default router;


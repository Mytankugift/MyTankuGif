/**
 * StalkerGift Routes
 * 
 * Rutas para el módulo de StalkerGift
 */

import { Router } from 'express';
import { StalkerGiftController } from './stalker-gift.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const stalkerGiftController = new StalkerGiftController();

// Crear StalkerGift
router.post('/', authenticate, stalkerGiftController.createStalkerGift);

// Checkout StalkerGift
router.post('/checkout', authenticate, stalkerGiftController.checkout);

// Obtener StalkerGift por token (público, sin autenticación)
router.get('/public/:token', stalkerGiftController.getStalkerGiftByToken);

// ⚠️ IMPORTANTE: Estas rutas DEBEN ir ANTES de /:id para evitar conflictos
// Obtener StalkerGifts enviados por el usuario
router.get('/sent', authenticate, stalkerGiftController.getStalkerGiftsBySender);

// Obtener StalkerGifts recibidos por el usuario
router.get('/received', authenticate, stalkerGiftController.getStalkerGiftsByReceiver);

// Obtener StalkerGift por ID (con autenticación) - DEBE IR AL FINAL
router.get('/:id', authenticate, stalkerGiftController.getStalkerGiftById);

// Aceptar StalkerGift
router.post('/:id/accept', authenticate, stalkerGiftController.acceptStalkerGift);

// Rechazar StalkerGift
router.post('/:id/reject', authenticate, stalkerGiftController.rejectStalkerGift);

// Cancelar StalkerGift
router.post('/:id/cancel', authenticate, stalkerGiftController.cancelStalkerGift);

// Generar link único
router.post('/:id/generate-link', authenticate, stalkerGiftController.generateUniqueLink);

// Revelar identidad en chat anónimo
router.post('/:id/reveal-identity', authenticate, stalkerGiftController.revealIdentityInChat);

// Verificar si puede ver perfil
router.get('/:id/can-view-profile', authenticate, stalkerGiftController.canViewProfile);

// Obtener información de visibilidad del perfil
router.get('/:id/profile-visibility', authenticate, stalkerGiftController.getProfileVisibilityInfo);

// Verificar si puede completar aceptación
router.get('/:id/can-complete-acceptance', authenticate, stalkerGiftController.canCompleteAcceptance);

export default router;


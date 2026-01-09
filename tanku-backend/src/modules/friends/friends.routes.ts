/**
 * Friends Routes
 * 
 * Rutas para el módulo de amigos
 */

import { Router } from 'express';
import { FriendsController } from './friends.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const friendsController = new FriendsController();

// Enviar solicitud de amistad
router.post('/requests', authenticate, friendsController.sendFriendRequest);

// Obtener solicitudes recibidas (pendientes)
router.get('/requests', authenticate, friendsController.getFriendRequests);

// Obtener solicitudes enviadas (pendientes)
router.get('/requests/sent', authenticate, friendsController.getSentFriendRequests);

// Aceptar o rechazar solicitud
router.put('/requests/:id', authenticate, friendsController.updateFriendRequest);

// Obtener lista de amigos (aceptados)
router.get('/', authenticate, friendsController.getFriends);

// Eliminar amigo
router.delete('/:friendId', authenticate, friendsController.removeFriend);

// Obtener sugerencias de amigos
router.get('/suggestions', authenticate, friendsController.getFriendSuggestions);

// Cancelar solicitud enviada
router.delete('/requests/:id', authenticate, friendsController.cancelSentRequest);

// Bloquear usuario
router.post('/block', authenticate, friendsController.blockUser);

// Desbloquear usuario
router.delete('/block/:userId', authenticate, friendsController.unblockUser);

// Obtener usuarios bloqueados
router.get('/blocked', authenticate, friendsController.getBlockedUsers);

export default router;


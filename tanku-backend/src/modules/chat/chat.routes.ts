/**
 * Chat Routes
 * 
 * Rutas para el módulo de chat
 */

import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const chatController = new ChatController();

// Crear o obtener conversación
router.post('/conversations', authenticate, chatController.createOrGetConversation);

// Obtener todas las conversaciones del usuario
router.get('/conversations', authenticate, chatController.getConversations);

// Obtener conversación específica
router.get('/conversations/:id', authenticate, chatController.getConversationById);

// Obtener mensajes de una conversación
router.get('/conversations/:id/messages', authenticate, chatController.getMessages);

// Enviar mensaje
router.post('/conversations/:id/messages', authenticate, chatController.sendMessage);

// Marcar mensajes como leídos
router.put('/conversations/:id/read', authenticate, chatController.markAsRead);

// Cerrar conversación
router.put('/conversations/:id/close', authenticate, chatController.closeConversation);

// Obtener contador de no leídos
router.get('/unread-count', authenticate, chatController.getUnreadCount);

export default router;


/**
 * Chat Routes
 * 
 * ⚠️ MÓDULO PREPARADO - NO IMPLEMENTADO
 * 
 * Este archivo define las rutas para el módulo de chat.
 * Ver README.md para instrucciones de implementación.
 */

import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const chatController = new ChatController();

// TODO: Implementar rutas según README.md
// router.post('/conversations', authenticate, chatController.createOrGetConversation);
// router.get('/conversations', authenticate, chatController.getConversations);
// router.get('/conversations/:id', authenticate, chatController.getConversationById);
// router.get('/conversations/:id/messages', authenticate, chatController.getMessages);
// router.post('/conversations/:id/messages', authenticate, chatController.sendMessage);
// router.put('/conversations/:id/read', authenticate, chatController.markAsRead);
// router.get('/unread-count', authenticate, chatController.getUnreadCount);

export default router;


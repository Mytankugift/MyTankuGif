/**
 * Chat Controller
 * 
 * ⚠️ MÓDULO PREPARADO - NO IMPLEMENTADO
 * 
 * Este controller está preparado para implementar mensajería directa.
 * Ver README.md para instrucciones de implementación.
 */

import { Request, Response, NextFunction } from 'express';
import { ChatService } from './chat.service';
import { RequestWithUser } from '../../shared/types';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  // TODO: Implementar endpoints según README.md
  // - createOrGetConversation
  // - getConversations
  // - getConversationById
  // - getMessages
  // - sendMessage
  // - markAsRead
  // - getUnreadCount
}


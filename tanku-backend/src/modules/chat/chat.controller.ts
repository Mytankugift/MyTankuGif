/**
 * Chat Controller
 * 
 * Controlador para gestionar conversaciones y mensajes
 */

import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  /**
   * POST /api/v1/chat/conversations
   * Crear o obtener conversación entre dos usuarios
   */
  createOrGetConversation = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { participantId, type, alias } = req.body;

      if (!participantId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'participantId es requerido'));
      }

      const conversation = await this.chatService.createOrGetConversation(
        userId,
        participantId,
        type || 'FRIENDS',
        alias
      );

      return res.status(200).json(successResponse(conversation));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/chat/conversations
   * Obtener todas las conversaciones del usuario
   */
  getConversations = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const conversations = await this.chatService.getConversations(userId);
      return res.status(200).json(successResponse(conversations));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/chat/conversations/:id
   * Obtener conversación específica
   */
  getConversationById = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const conversation = await this.chatService.getConversationById(id, userId);
      return res.status(200).json(successResponse(conversation));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/chat/conversations/:id/messages
   * Obtener mensajes de una conversación
   */
  getMessages = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await this.chatService.getMessages(id, userId, page, limit);
      return res.status(200).json(successResponse(messages));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Enviar mensaje (DEPRECADO - usar Socket)
   */
  sendMessage = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { content, type } = req.body;

      if (!content) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'content es requerido'));
      }

      const message = await this.chatService.sendMessage(id, userId, content, type || 'TEXT');
      return res.status(201).json(successResponse(message));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * PUT /api/v1/chat/conversations/:id/read
   * Marcar mensajes como leídos (DEPRECADO - usar Socket)
   */
  markAsRead = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await this.chatService.markAsRead(id, userId);
      return res.status(200).json(successResponse({ success: true }));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * GET /api/v1/chat/unread-count
   * Obtener contador de mensajes no leídos
   */
  getUnreadCount = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const count = await this.chatService.getUnreadCount(userId);
      return res.status(200).json(successResponse({ count }));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };

  /**
   * PUT /api/v1/chat/conversations/:id/close
   * Cerrar conversación
   */
  closeConversation = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await this.chatService.closeConversation(id, userId);
      return res.status(200).json(successResponse({ success: true }));
    } catch (error: any) {
      return res.status(error.statusCode || 500).json(errorResponse(ErrorCode.INTERNAL_ERROR, error.message));
    }
  };
}


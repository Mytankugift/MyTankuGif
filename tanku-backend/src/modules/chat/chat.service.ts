/**
 * Chat Service
 * 
 * Servicio para gestionar conversaciones y mensajes en tiempo real
 * Soporta chat entre amigos y chat anónimo para StalkerGift
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError';
import type { Conversation, ConversationParticipant, Message, User, UserProfile } from '@prisma/client';

export interface ConversationWithParticipants extends Conversation {
  participants: (ConversationParticipant & {
    user: User & { profile: UserProfile | null };
  })[];
  messages?: Message[];
}

export interface MessageWithSender extends Message {
  sender: User & { profile: UserProfile | null };
}

export class ChatService {
  /**
   * Crear o obtener conversación entre dos usuarios
   */
  async createOrGetConversation(
    userId: string,
    participantId: string,
    type: 'FRIENDS' | 'STALKERGIFT' = 'FRIENDS',
    alias?: { userId: string; participantId: string }
  ): Promise<ConversationWithParticipants> {
    // Validar que no sea el mismo usuario
    if (userId === participantId) {
      throw new BadRequestError('No puedes crear una conversación contigo mismo');
    }

    // Buscar conversación existente entre estos dos usuarios
    // Usar AND para buscar conversaciones que tengan AMBOS usuarios
    const existingConversations = await prisma.conversation.findMany({
      where: {
        type,
        status: 'ACTIVE',
        AND: [
          {
            participants: {
              some: { userId: userId },
            },
          },
          {
            participants: {
              some: { userId: participantId },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    // Verificar que tenga EXACTAMENTE 2 participantes (los dos usuarios)
    const existing = existingConversations.find((conv) => {
      const participantIds = conv.participants.map((p) => p.userId);
      return (
        participantIds.length === 2 &&
        participantIds.includes(userId) &&
        participantIds.includes(participantId)
      );
    });

    if (existing) {
      return existing as ConversationWithParticipants;
    }

    // Crear nueva conversación
    const conversation = await prisma.conversation.create({
      data: {
        type,
        status: 'ACTIVE',
        participants: {
          create: [
            {
              userId,
              alias: alias?.userId,
              isRevealed: type === 'FRIENDS', // En FRIENDS siempre revelado
            },
            {
              userId: participantId,
              alias: alias?.participantId,
              isRevealed: type === 'FRIENDS',
            },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    return conversation as ConversationWithParticipants;
  }

  /**
   * Obtener conversaciones de un usuario
   * Incluye conversaciones tipo FRIENDS y STALKERGIFT
   * SOLO retorna conversaciones reales (NO temporales)
   * OPTIMIZADO: Reduce queries de N+1 a batch queries
   */
  async getConversations(userId: string): Promise<ConversationWithParticipants[]> {
    // Obtener conversaciones existentes con UNA query optimizada
    // Incluir tanto FRIENDS como STALKERGIFT (chats anónimos)
    const conversations = await prisma.conversation.findMany({
      where: {
        type: { in: ['FRIENDS', 'STALKERGIFT'] }, // Incluir ambos tipos
        status: 'ACTIVE',
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Ordenar por última actividad
    conversations.sort((a, b) => {
      const aTime = a.messages && a.messages.length > 0
        ? new Date(a.messages[0].createdAt).getTime()
        : new Date(a.updatedAt).getTime();
      const bTime = b.messages && b.messages.length > 0
        ? new Date(b.messages[0].createdAt).getTime()
        : new Date(b.updatedAt).getTime();
      return bTime - aTime; // Más reciente primero
    });

    return conversations as ConversationWithParticipants[];
  }

  /**
   * Obtener conversación por ID
   */
  async getConversationById(conversationId: string, userId: string): Promise<ConversationWithParticipants> {
    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversación no encontrada');
    }

    return conversation as ConversationWithParticipants;
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<MessageWithSender[]> {
    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Invertir para mostrar más antiguos primero
    return messages.reverse() as MessageWithSender[];
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'
  ): Promise<MessageWithSender> {
    // Validar contenido
    if (!content || content.trim().length === 0) {
      throw new BadRequestError('El mensaje no puede estar vacío');
    }

    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    // Verificar que la conversación esté activa
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundError('Conversación no encontrada');
    }

    if (conversation.status !== 'ACTIVE') {
      throw new BadRequestError('La conversación está cerrada');
    }

    // Obtener alias si existe (para anonimato)
    const senderAlias = participant.alias || null;

    // Crear mensaje
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        senderAlias,
        content: content.trim(),
        type,
        status: 'SENT',
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Actualizar última actividad de la conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message as MessageWithSender;
  }

  /**
   * Marcar mensajes como leídos
   * También marca las notificaciones relacionadas como leídas
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    // Marcar todos los mensajes no leídos como leídos
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    // Marcar notificaciones relacionadas con esta conversación como leídas
    // Solo las notificaciones de tipo MESSAGE relacionadas con esta conversación
    // Primero obtener todas las notificaciones no leídas de tipo MESSAGE del usuario
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        userId,
        type: 'MESSAGE',
        isRead: false,
      },
    });

    // Filtrar las que pertenecen a esta conversación específica
    const notificationsToMark = unreadNotifications.filter(notif => {
      if (!notif.data || typeof notif.data !== 'object') return false;
      const data = notif.data as any;
      return data.conversationId === conversationId;
    });

    // Marcar solo las notificaciones de esta conversación como leídas
    if (notificationsToMark.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: {
            in: notificationsToMark.map(n => n.id),
          },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }
  }

  /**
   * Obtener contador de mensajes no leídos
   */
  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
        status: 'ACTIVE',
      },
      include: {
        messages: {
          where: {
            senderId: { not: userId },
            status: { not: 'READ' },
          },
        },
      },
    });

    let total = 0;
    conversations.forEach((conv) => {
      total += conv.messages.length;
    });

    return total;
  }

  /**
   * Cerrar conversación
   */
  async closeConversation(conversationId: string, userId: string): Promise<void> {
    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    // Cerrar conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' },
    });
  }

  /**
   * Revelar identidad en chat StalkerGift
   */
  async revealIdentity(conversationId: string, userId: string): Promise<void> {
    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    // Verificar que sea un chat StalkerGift
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.type !== 'STALKERGIFT') {
      throw new BadRequestError('Solo se puede revelar identidad en chats StalkerGift');
    }

    // Revelar identidad
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { isRevealed: true },
    });
  }
}


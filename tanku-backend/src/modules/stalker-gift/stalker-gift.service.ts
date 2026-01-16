/**
 * StalkerGift Service
 * 
 * Servicio para gestionar regalos anónimos (StalkerGift)
 * Soporta regalos a usuarios internos y externos
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError';
import crypto from 'crypto';
import { env } from '../../config/env';
import { ChatService } from '../chat/chat.service';
import type { StalkerGift, StalkerGiftStatus, User, UserProfile, Product, ProductVariant, Conversation } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface StalkerGiftWithRelations extends StalkerGift {
  sender: User & { profile: UserProfile | null };
  receiver?: (User & { profile: UserProfile | null }) | null;
  product: Product;
  variant?: ProductVariant | null;
  order?: any;
  conversation?: any;
}

export interface CreateStalkerGiftInput {
  senderId: string;
  receiverId?: string; // Si es usuario interno
  externalReceiverData?: {
    instagram?: string;
    email?: string;
    phone?: string;
    name?: string;
  };
  productId: string;
  variantId?: string;
  quantity: number;
  senderAlias: string;
  senderMessage?: string;
}

export interface AcceptStalkerGiftInput {
  stalkerGiftId: string;
  receiverId: string;
  addressId: string;
}

export class StalkerGiftService {
  /**
   * Crear StalkerGift
   */
  async createStalkerGift(data: CreateStalkerGiftInput): Promise<StalkerGiftWithRelations> {
    // Validar que el producto existe y está activo
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (!product.active) {
      throw new BadRequestError('El producto no está disponible');
    }

    // Validar variante si se proporciona
    if (data.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: data.variantId },
        include: {
          warehouseVariants: {
            select: {
              stock: true,
            },
          },
        },
      });

      if (!variant) {
        throw new NotFoundError('Variante no encontrada');
      }
      if (!variant.active) {
        throw new BadRequestError('La variante no está disponible');
      }

      // Calcular stock total desde warehouseVariants
      const totalStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;

      if (totalStock < data.quantity) {
        throw new BadRequestError(`Stock insuficiente. Disponible: ${totalStock}, Solicitado: ${data.quantity}`);
      }
    } else {
      // Si no hay variante, validar que exista al menos una variante con stock
      const variantsWithStock = await prisma.productVariant.findMany({
        where: {
          productId: data.productId,
          active: true,
        },
        include: {
          warehouseVariants: {
            select: {
              stock: true,
            },
          },
        },
      });

      let maxAvailableQuantity = 0;
      for (const variant of variantsWithStock) {
        const variantStock = variant.warehouseVariants?.reduce(
          (sum, wv) => sum + (wv.stock || 0),
          0
        ) || 0;
        maxAvailableQuantity = Math.max(maxAvailableQuantity, variantStock);
      }

      if (maxAvailableQuantity < data.quantity) {
        throw new BadRequestError(`Stock insuficiente. Disponible: ${maxAvailableQuantity}, Solicitado: ${data.quantity}`);
      }
    }

    // Validar que no sea para el mismo usuario
    if (data.receiverId && data.senderId === data.receiverId) {
      throw new BadRequestError('No puedes enviarte un regalo a ti mismo');
    }

    // Validar alias
    if (!data.senderAlias || data.senderAlias.trim().length === 0) {
      throw new BadRequestError('El alias del remitente es requerido');
    }

    // Validar que hay receptor (interno o externo)
    if (!data.receiverId && !data.externalReceiverData) {
      throw new BadRequestError('Debes especificar un receptor (interno o externo)');
    }

    // Crear StalkerGift
    const stalkerGift = await prisma.stalkerGift.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId || null,
        externalReceiverData: data.externalReceiverData || Prisma.JsonNull,
        productId: data.productId,
        variantId: data.variantId || null,
        quantity: data.quantity,
        senderAlias: data.senderAlias.trim(),
        senderMessage: data.senderMessage?.trim() || null,
        estado: 'CREATED',
      },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });

    return stalkerGift as StalkerGiftWithRelations;
  }

  /**
   * Generar link único para aceptación
   */
  async generateUniqueLink(stalkerGiftId: string): Promise<string> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const link = `${env.FRONTEND_URL || 'http://localhost:3000'}/stalkergift/accept/${token}`;

    // Actualizar con link y token
    await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        uniqueLink: link,
        linkToken: token,
      },
    });

    return link;
  }

  /**
   * Obtener StalkerGift por token (público, para página de aceptación)
   */
  async getStalkerGiftByToken(token: string): Promise<StalkerGiftWithRelations> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { linkToken: token },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar que esté en estado correcto
    if (stalkerGift.estado !== 'WAITING_ACCEPTANCE' && stalkerGift.estado !== 'PAID') {
      throw new BadRequestError('Este regalo no está disponible para aceptación');
    }

    return stalkerGift as StalkerGiftWithRelations;
  }

  /**
   * Obtener StalkerGift por ID (con validación de acceso)
   */
  async getStalkerGiftById(stalkerGiftId: string, userId: string): Promise<StalkerGiftWithRelations> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
        order: true,
        conversation: true,
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar acceso: solo sender o receiver pueden ver
    if (stalkerGift.senderId !== userId && stalkerGift.receiverId !== userId) {
      throw new ForbiddenError('No tienes acceso a este regalo');
    }

    return stalkerGift as StalkerGiftWithRelations;
  }

  /**
   * Obtener StalkerGifts enviados por un usuario
   */
  async getStalkerGiftsBySender(senderId: string): Promise<StalkerGiftWithRelations[]> {
    const stalkerGifts = await prisma.stalkerGift.findMany({
      where: { senderId },
      include: {
        product: true,
        variant: true,
        receiver: {
          include: {
            profile: true,
          },
        },
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return stalkerGifts as StalkerGiftWithRelations[];
  }

  /**
   * Obtener StalkerGifts recibidos por un usuario
   */
  async getStalkerGiftsByReceiver(receiverId: string): Promise<StalkerGiftWithRelations[]> {
    const stalkerGifts = await prisma.stalkerGift.findMany({
      where: { receiverId },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return stalkerGifts as StalkerGiftWithRelations[];
  }

  /**
   * Aceptar StalkerGift
   */
  async acceptStalkerGift(
    stalkerGiftId: string,
    receiverId: string,
    addressId: string
  ): Promise<StalkerGiftWithRelations> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar estado
    if (stalkerGift.estado !== 'WAITING_ACCEPTANCE' && stalkerGift.estado !== 'PAID') {
      throw new BadRequestError('El regalo no está en estado de espera de aceptación');
    }

    // Validar que la dirección existe y pertenece al usuario
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: receiverId,
      },
    });

    if (!address) {
      throw new NotFoundError('Dirección no encontrada o no pertenece al usuario');
    }

    // Actualizar StalkerGift
    const updated = await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        receiverId,
        estado: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Crear chat anónimo automáticamente cuando se acepta el regalo
    // Esto aplica para todos los escenarios (externo, interno, amigos)
    try {
      await this.createAnonymousChat(stalkerGiftId);
    } catch (error: any) {
      // Log error pero no fallar la aceptación
      console.error(`⚠️ [StalkerGift] Error creando chat anónimo: ${error.message}`);
    }

    // Crear orden Dropi después de aceptar
    try {
      const { DropiOrdersService } = await import('../orders/dropi-orders.service');
      const dropiOrdersService = new DropiOrdersService();
      
      const dropiResult = await dropiOrdersService.createOrderFromStalkerGift(
        stalkerGiftId,
        addressId
      );
      
      console.log(`✅ [StalkerGift] Orden Dropi creada: ${dropiResult.dropiOrderIds.join(', ')}`);
    } catch (error: any) {
      // Log error pero no fallar la aceptación
      console.error(`⚠️ [StalkerGift] Error creando orden Dropi: ${error.message}`);
      // El regalo ya fue aceptado, pero la orden Dropi falló
      // Se puede reintentar más tarde
    }

    // Notificar al sender que el regalo fue aceptado
    try {
      const { NotificationsService } = await import('../notifications/notifications.service');
      const notificationsService = new NotificationsService();
      
      await notificationsService.createNotification({
        userId: updated.senderId,
        type: 'stalker_gift_accepted',
        title: '¡Tu regalo fue aceptado!',
        message: `${updated.receiver?.firstName || 'Alguien'} aceptó tu regalo. Ya puedes chatear con ${updated.receiver?.firstName || 'ellos'} de forma anónima.`,
        data: {
          stalkerGiftId: stalkerGiftId,
          conversationId: updated.conversationId,
        },
      });
      
      console.log(`✅ [StalkerGift] Notificación enviada al sender: ${updated.senderId}`);
    } catch (error: any) {
      // Log error pero no fallar la aceptación
      console.error(`⚠️ [StalkerGift] Error enviando notificación: ${error.message}`);
    }

    return updated as StalkerGiftWithRelations;
  }

  /**
   * Rechazar StalkerGift
   */
  async rejectStalkerGift(stalkerGiftId: string, userId: string): Promise<StalkerGiftWithRelations> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar que el usuario es el receptor
    if (stalkerGift.receiverId !== userId) {
      throw new ForbiddenError('Solo el receptor puede rechazar el regalo');
    }

    // Validar estado
    if (stalkerGift.estado !== 'WAITING_ACCEPTANCE' && stalkerGift.estado !== 'PAID') {
      throw new BadRequestError('El regalo no puede ser rechazado en este estado');
    }

    // Actualizar estado
    const updated = await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        estado: 'REJECTED',
      },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Notificar al sender que el regalo fue rechazado
    try {
      const { NotificationsService } = await import('../notifications/notifications.service');
      const notificationsService = new NotificationsService();
      
      await notificationsService.createNotification({
        userId: updated.senderId,
        type: 'stalker_gift_rejected',
        title: 'Regalo rechazado',
        message: `${updated.receiver?.firstName || 'El receptor'} rechazó tu regalo.`,
        data: {
          stalkerGiftId: stalkerGiftId,
        },
      });
      
      console.log(`✅ [StalkerGift] Notificación de rechazo enviada al sender: ${updated.senderId}`);
    } catch (error: any) {
      // Log error pero no fallar el rechazo
      console.error(`⚠️ [StalkerGift] Error enviando notificación de rechazo: ${error.message}`);
    }

    // TODO: Procesar reembolso si es necesario

    return updated as StalkerGiftWithRelations;
  }

  /**
   * Cancelar StalkerGift (solo el sender puede cancelar)
   */
  async cancelStalkerGift(stalkerGiftId: string, userId: string): Promise<StalkerGiftWithRelations> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar que el usuario es el sender
    if (stalkerGift.senderId !== userId) {
      throw new ForbiddenError('Solo el remitente puede cancelar el regalo');
    }

    // Validar estado (no se puede cancelar si ya fue aceptado)
    if (stalkerGift.estado === 'ACCEPTED') {
      throw new BadRequestError('No se puede cancelar un regalo ya aceptado');
    }

    // Actualizar estado
    const updated = await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        estado: 'CANCELLED',
      },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });

    // TODO: Procesar reembolso si ya se pagó

    return updated as StalkerGiftWithRelations;
  }

  /**
   * Actualizar estado de pago (usado por webhook de ePayco)
   */
  async updatePaymentStatus(
    stalkerGiftId: string,
    paymentStatus: string,
    paymentId?: string,
    transactionId?: string
  ): Promise<StalkerGiftWithRelations> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Determinar nuevo estado según paymentStatus
    let newEstado: StalkerGiftStatus = stalkerGift.estado;

    if (paymentStatus === 'approved' || paymentStatus === 'success' || paymentStatus === 'paid') {
      newEstado = 'WAITING_ACCEPTANCE';
      
      // Solo generar link si es usuario externo (receiverId es null)
      // Si es usuario Tanku (receiverId existe), NO generar link - enviar notificación directa
      if (!stalkerGift.receiverId && (!stalkerGift.uniqueLink || !stalkerGift.linkToken)) {
        // Usuario externo: generar link único
        await this.generateUniqueLink(stalkerGiftId);
      }
    } else if (paymentStatus === 'rejected' || paymentStatus === 'failed') {
      newEstado = 'CREATED'; // Volver a CREATED para reintentar
    }

    // Actualizar
    const updated = await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        estado: newEstado,
        paymentStatus,
        paymentId: paymentId || stalkerGift.paymentId,
        transactionId: transactionId || stalkerGift.transactionId,
      },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Si es usuario Tanku (receiverId existe) y el pago fue exitoso, enviar notificación
    if ((paymentStatus === 'approved' || paymentStatus === 'success' || paymentStatus === 'paid') && updated.receiverId) {
      try {
        const { NotificationsService } = await import('../notifications/notifications.service');
        const notificationsService = new NotificationsService();

        await notificationsService.createNotification({
          userId: updated.receiverId,
          type: 'stalkergift_received',
          title: '¡Tienes un nuevo regalo!',
          message: `${updated.senderAlias} te ha enviado un regalo`,
          data: {
            stalkerGiftId: updated.id,
            senderAlias: updated.senderAlias,
            productId: updated.productId,
            productTitle: updated.product.title,
          },
        });

        console.log(`✅ [StalkerGift] Notificación enviada a usuario Tanku: ${updated.receiverId}`);
      } catch (notificationError: any) {
        // Log error pero no fallar el proceso
        console.error(`⚠️ [StalkerGift] Error enviando notificación:`, notificationError?.message);
      }
    }

    return updated as StalkerGiftWithRelations;
  }

  /**
   * Vincular orden Dropi a StalkerGift (después de aceptación)
   */
  async linkOrder(stalkerGiftId: string, orderId: string): Promise<StalkerGiftWithRelations> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    if (stalkerGift.estado !== 'ACCEPTED') {
      throw new BadRequestError('Solo se puede vincular una orden a un regalo aceptado');
    }

    const updated = await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        orderId,
      },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
        order: true,
      },
    });

    return updated as StalkerGiftWithRelations;
  }

  /**
   * Verificar si dos usuarios son amigos
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    if (userId1 === userId2) {
      return false; // No se puede ser amigo de uno mismo
    }

    const friendship = await prisma.friend.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { userId: userId1, friendId: userId2 },
          { userId: userId2, friendId: userId1 },
        ],
      },
    });

    return !!friendship;
  }

  /**
   * Crear chat anónimo cuando se acepta el regalo
   * Este método crea una conversación tipo STALKERGIFT con alias
   */
  async createAnonymousChat(stalkerGiftId: string): Promise<Conversation> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
      include: {
        sender: true,
        receiver: true,
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    if (stalkerGift.estado !== 'ACCEPTED') {
      throw new BadRequestError('Solo se puede crear chat para regalos aceptados');
    }

    if (!stalkerGift.receiverId) {
      throw new BadRequestError('El regalo debe tener un receptor para crear chat');
    }

    // Verificar si ya existe un chat para este StalkerGift
    if (stalkerGift.conversationId) {
      const existingConversation = await prisma.conversation.findUnique({
        where: { id: stalkerGift.conversationId },
      });
      if (existingConversation) {
        return existingConversation;
      }
    }

    const chatService = new ChatService();

    // Crear conversación anónima con alias
    // El sender usa su alias configurado, el receiver usa un alias genérico por ahora
    // (puede personalizarse después)
    const conversation = await chatService.createOrGetConversation(
      stalkerGift.senderId,
      stalkerGift.receiverId,
      'STALKERGIFT',
      {
        userId: stalkerGift.senderAlias, // Alias del sender
        participantId: 'Anónimo', // Alias genérico para el receiver (puede personalizarse)
      }
    );

    // Vincular conversación al StalkerGift
    await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        conversationId: conversation.id,
        chatEnabled: true,
      },
    });

    return conversation;
  }

  /**
   * Verificar si el usuario puede ver el perfil del otro en el contexto del StalkerGift
   * Reglas:
   * - Si son amigos Y la identidad está revelada: puede ver perfil
   * - Si NO son amigos pero la identidad está revelada: puede ver perfil
   * - Si la identidad NO está revelada: NO puede ver perfil (incluso si son amigos)
   */
  async canViewProfile(stalkerGiftId: string, viewerId: string): Promise<boolean> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar que el viewer es sender o receiver
    if (stalkerGift.senderId !== viewerId && stalkerGift.receiverId !== viewerId) {
      throw new ForbiddenError('No tienes acceso a este regalo');
    }

    // Si no hay conversación, no puede ver perfil (chat no iniciado)
    if (!stalkerGift.conversation || !stalkerGift.conversationId) {
      return false;
    }

    // Determinar el otro usuario
    const otherUserId = viewerId === stalkerGift.senderId 
      ? stalkerGift.receiverId 
      : stalkerGift.senderId;

    if (!otherUserId) {
      return false; // Usuario externo sin cuenta aún
    }

    // Buscar el participante del otro usuario en la conversación
    const otherParticipant = stalkerGift.conversation.participants.find(
      (p) => p.userId === otherUserId
    );

    if (!otherParticipant) {
      return false;
    }

    // La regla clave: solo puede ver perfil si la identidad está revelada
    // Esto aplica incluso si son amigos (escenario 3)
    return otherParticipant.isRevealed === true;
  }

  /**
   * Revelar identidad en el chat anónimo del StalkerGift
   * Esto permite que el otro usuario vea el perfil y datos reales
   */
  async revealIdentityInChat(stalkerGiftId: string, userId: string): Promise<void> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar que el usuario es sender o receiver
    if (stalkerGift.senderId !== userId && stalkerGift.receiverId !== userId) {
      throw new ForbiddenError('No tienes acceso a este regalo');
    }

    if (!stalkerGift.conversation || !stalkerGift.conversationId) {
      throw new BadRequestError('No existe un chat para este regalo');
    }

    if (stalkerGift.conversation.type !== 'STALKERGIFT') {
      throw new BadRequestError('Solo se puede revelar identidad en chats StalkerGift');
    }

    // Buscar el participante del usuario
    const participant = stalkerGift.conversation.participants.find(
      (p) => p.userId === userId
    );

    if (!participant) {
      throw new NotFoundError('No eres participante de esta conversación');
    }

    // Revelar identidad
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { isRevealed: true },
    });
  }

  /**
   * Obtener información de visibilidad del perfil en el contexto del StalkerGift
   * Retorna información sobre si puede ver perfil y por qué
   */
  async getProfileVisibilityInfo(stalkerGiftId: string, viewerId: string): Promise<{
    canViewProfile: boolean;
    areFriends: boolean;
    isIdentityRevealed: boolean;
    reason?: string;
  }> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar acceso
    if (stalkerGift.senderId !== viewerId && stalkerGift.receiverId !== viewerId) {
      throw new ForbiddenError('No tienes acceso a este regalo');
    }

    const otherUserId = viewerId === stalkerGift.senderId 
      ? stalkerGift.receiverId 
      : stalkerGift.senderId;

    if (!otherUserId) {
      return {
        canViewProfile: false,
        areFriends: false,
        isIdentityRevealed: false,
        reason: 'Usuario externo sin cuenta',
      };
    }

    // Verificar si son amigos
    const areFriends = await this.areFriends(viewerId, otherUserId);

    // Verificar si la identidad está revelada
    let isIdentityRevealed = false;
    if (stalkerGift.conversation) {
      const otherParticipant = stalkerGift.conversation.participants.find(
        (p) => p.userId === otherUserId
      );
      isIdentityRevealed = otherParticipant?.isRevealed || false;
    }

    // Regla: solo puede ver perfil si la identidad está revelada
    const canViewProfile = isIdentityRevealed;

    let reason: string | undefined;
    if (!canViewProfile) {
      if (!stalkerGift.conversation) {
        reason = 'El chat aún no ha sido iniciado';
      } else if (!isIdentityRevealed) {
        reason = 'La identidad no ha sido revelada en el chat anónimo';
      }
    }

    return {
      canViewProfile,
      areFriends,
      isIdentityRevealed,
      reason,
    };
  }

  /**
   * Verificar si el usuario puede completar la aceptación del regalo
   * Retorna información sobre si tiene dirección y puede proceder
   */
  async canCompleteAcceptance(
    stalkerGiftId: string,
    userId: string
  ): Promise<{
    canComplete: boolean;
    hasAddress: boolean;
    addresses: any[];
    stalkerGift: StalkerGiftWithRelations;
    reason?: string;
  }> {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
      include: {
        product: true,
        variant: true,
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    // Validar estado
    if (stalkerGift.estado !== 'WAITING_ACCEPTANCE' && stalkerGift.estado !== 'PAID') {
      return {
        canComplete: false,
        hasAddress: false,
        addresses: [],
        stalkerGift: stalkerGift as StalkerGiftWithRelations,
        reason: 'El regalo no está en estado de espera de aceptación',
      };
    }

    // Validar que el usuario es el receptor (o puede serlo si es externo)
    // Si es externo, receiverId puede ser null, así que permitimos que cualquier usuario autenticado pueda aceptar
    if (stalkerGift.receiverId && stalkerGift.receiverId !== userId) {
      throw new ForbiddenError('Solo el receptor puede aceptar este regalo');
    }

    // Obtener direcciones del usuario
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const hasAddress = addresses.length > 0;
    const canComplete = hasAddress; // Puede completar si tiene al menos una dirección

    return {
      canComplete,
      hasAddress,
      addresses,
      stalkerGift: stalkerGift as StalkerGiftWithRelations,
      reason: canComplete ? undefined : 'Debes crear una dirección para completar la aceptación',
    };
  }

  /**
   * Checkout StalkerGift - Preparar datos para ePayco
   * Similar al checkout normal pero crea StalkerGift en lugar de Order
   */
  async checkoutStalkerGift(data: {
    senderId: string;
    receiverId?: string;
    externalReceiverData?: {
      instagram?: string;
      email?: string;
      phone?: string;
      name?: string;
    };
    productId: string;
    variantId?: string;
    quantity: number;
    senderAlias: string;
    senderMessage?: string;
  }): Promise<{
    stalkerGiftId: string;
    cartId: string;
    total: number;
    subtotal: number;
    shippingTotal: number;
  }> {
    // Crear StalkerGift
    const stalkerGift = await this.createStalkerGift(data);

    // Calcular totales
    // Obtener precio de la variante o producto
    let unitPrice = 0;
    if (stalkerGift.variant) {
      // Usar suggestedPrice si existe, sino price
      unitPrice = stalkerGift.variant.suggestedPrice || stalkerGift.variant.price;
    } else if (stalkerGift.product) {
      // Si no hay variante, usar el precio mínimo de las variantes
      const variants = await prisma.productVariant.findMany({
        where: { productId: stalkerGift.productId, active: true },
      });
      if (variants.length > 0) {
        const minVariant = variants.reduce((min, v) => {
          const price = v.suggestedPrice || v.price;
          const minPrice = min.suggestedPrice || min.price;
          return price < minPrice ? v : min;
        });
        unitPrice = minVariant.suggestedPrice || minVariant.price;
      }
    }

    // Calcular totales (aplicar incremento del 15% + $10,000 por unidad como en checkout normal)
    // Fórmula: (precio * 1.15) + 10,000 por cada unidad
    const finalUnitPrice = Math.round((unitPrice * 1.15) + 10000);
    const subtotal = finalUnitPrice * stalkerGift.quantity;
    const shippingTotal = 0; // Se actualizará con Dropi después de aceptación
    const total = subtotal + shippingTotal;

    // Crear un carrito temporal para guardar metadata de checkout
    // Esto permite usar el mismo flujo de webhook de ePayco
    // El cartId será usado como orderId en ePayco
    const tempCart = await prisma.cart.create({
      data: {
        userId: data.senderId,
        metadata: {
          isStalkerGift: true,
          stalkerGiftId: stalkerGift.id,
          checkout_data: {
            total,
            subtotal,
            shippingTotal,
            preparedAt: new Date().toISOString(),
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`✅ [STALKERGIFT-CHECKOUT] Carrito temporal creado: ${tempCart.id} para StalkerGift: ${stalkerGift.id}`);

    return {
      stalkerGiftId: stalkerGift.id,
      cartId: tempCart.id, // Retornar cartId para usar en ePayco
      total,
      subtotal,
      shippingTotal,
    };
  }
}


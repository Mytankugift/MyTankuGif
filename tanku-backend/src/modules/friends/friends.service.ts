/**
 * Friends Service
 * 
 * Servicio para gestionar relaciones de amistad entre usuarios
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../shared/errors/AppError';
import {
  FriendDTO,
  FriendRequestDTO,
  FriendSuggestionDTO,
  CreateFriendRequestDTO,
  UpdateFriendRequestDTO,
  FriendUserDTO,
} from '../../shared/dto/friends.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';

export class FriendsService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  /**
   * Mapear usuario a FriendUserDTO
   */
  private mapUserToFriendUserDTO(user: any): FriendUserDTO {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profile: user.profile
        ? {
            avatar: user.profile.avatar,
            banner: user.profile.banner,
            bio: user.profile.bio,
          }
        : null,
    };
  }

  /**
   * Mapear Friend a FriendDTO
   */
  private mapFriendToDTO(friend: any): FriendDTO {
    return {
      id: friend.id,
      userId: friend.userId,
      friendId: friend.friendId,
      status: friend.status as 'pending' | 'accepted' | 'blocked',
      friend: this.mapUserToFriendUserDTO(friend.friend),
      createdAt: friend.createdAt.toISOString(),
      updatedAt: friend.updatedAt.toISOString(),
    };
  }

  /**
   * Enviar solicitud de amistad
   */
  async sendFriendRequest(userId: string, data: CreateFriendRequestDTO): Promise<FriendDTO> {
    const { friendId } = data;

    // Validar que no se envíe solicitud a sí mismo
    if (userId === friendId) {
      throw new BadRequestError('No puedes enviar una solicitud de amistad a ti mismo');
    }

    // Verificar que el usuario destino existe
    const friendUser = await prisma.user.findUnique({
      where: { id: friendId },
      include: { profile: true },
    });

    if (!friendUser) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Verificar si ya existe una relación
    const existingFriend = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existingFriend) {
      if (existingFriend.status === 'accepted') {
        throw new ConflictError('Ya son amigos');
      }
      if (existingFriend.status === 'pending') {
        throw new ConflictError('Ya existe una solicitud pendiente');
      }
      if (existingFriend.status === 'blocked') {
        throw new ConflictError('No puedes enviar solicitud a este usuario');
      }
    }

    // Obtener información del usuario que envía la solicitud
    const fromUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    // Crear solicitud de amistad
    const friend = await prisma.friend.create({
      data: {
        userId,
        friendId,
        status: 'pending',
      },
      include: {
        friend: {
          include: {
            profile: true,
          },
        },
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Crear notificación para el usuario destino
    try {
      const fromUserName = fromUser?.firstName || 'Alguien';
      await this.notificationsService.createNotification({
        userId: friendId,
        type: 'friend_request',
        title: 'Nueva solicitud de amistad',
        message: `${fromUserName} te envió una solicitud de amistad`,
        data: {
          fromUserId: userId,
          friendRequestId: friend.id,
        },
      });
    } catch (error) {
      // Si falla la notificación, no fallar la solicitud
      console.error('Error creando notificación de solicitud de amistad:', error);
    }

    return this.mapFriendToDTO(friend);
  }

  /**
   * Obtener solicitudes recibidas (pendientes)
   */
  async getFriendRequests(userId: string): Promise<FriendRequestDTO[]> {
    const requests = await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: 'pending',
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) => ({
      id: request.id,
      userId: request.userId,
      friendId: request.friendId,
      status: request.status as 'pending' | 'accepted' | 'blocked',
      fromUser: this.mapUserToFriendUserDTO(request.user),
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    }));
  }

  /**
   * Obtener solicitudes enviadas (pendientes)
   */
  async getSentFriendRequests(userId: string): Promise<FriendRequestDTO[]> {
    const requests = await prisma.friend.findMany({
      where: {
        userId,
        status: 'pending',
      },
      include: {
        friend: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) => ({
      id: request.id,
      userId: request.userId,
      friendId: request.friendId,
      status: request.status as 'pending' | 'accepted' | 'blocked',
      fromUser: this.mapUserToFriendUserDTO(request.friend),
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    }));
  }

  /**
   * Actualizar solicitud (aceptar/rechazar)
   */
  async updateFriendRequest(
    requestId: string,
    userId: string,
    data: UpdateFriendRequestDTO
  ): Promise<FriendDTO> {
    const { status } = data;

    // Buscar la solicitud
    const request = await prisma.friend.findUnique({
      where: { id: requestId },
      include: {
        user: {
          include: { profile: true },
        },
        friend: {
          include: { profile: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    // Verificar que el usuario es el destinatario
    if (request.friendId !== userId) {
      throw new ForbiddenError('No tienes permiso para actualizar esta solicitud');
    }

    // Verificar que la solicitud está pendiente
    if (request.status !== 'pending') {
      throw new BadRequestError('La solicitud ya fue procesada');
    }

    if (status === 'accepted') {
      // Obtener información del usuario que acepta
      const acceptingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      // Aceptar: actualizar el estado
      const updated = await prisma.friend.update({
        where: { id: requestId },
        data: { status: 'accepted' },
        include: {
          friend: {
            include: { profile: true },
          },
          user: {
            include: { profile: true },
          },
        },
      });

      // Crear conversación automáticamente cuando se acepta la amistad
      try {
        const { ChatService } = await import('../chat/chat.service');
        const chatService = new ChatService();
        await chatService.createOrGetConversation(
          request.userId,
          userId,
          'FRIENDS'
        );
      } catch (error) {
        // Si falla la creación de conversación, no fallar la aceptación
        console.error('Error creando conversación al aceptar amistad:', error);
      }

      // Crear notificación para el usuario que envió la solicitud
      try {
        const acceptingUserName = acceptingUser?.firstName || 'Alguien';
        await this.notificationsService.createNotification({
          userId: request.userId,
          type: 'friend_accepted',
          title: 'Solicitud de amistad aceptada',
          message: `${acceptingUserName} aceptó tu solicitud de amistad`,
          data: {
            friendId: userId,
            friendRequestId: requestId,
          },
        });
      } catch (error) {
        // Si falla la notificación, no fallar la aceptación
        console.error('Error creando notificación de amistad aceptada:', error);
      }

      return this.mapFriendToDTO(updated);
    } else if (status === 'rejected') {
      // Rechazar: eliminar la solicitud
      await prisma.friend.delete({
        where: { id: requestId },
      });

      // Retornar la solicitud eliminada (para confirmación)
      return this.mapFriendToDTO(request);
    } else {
      throw new BadRequestError('Estado inválido. Use "accepted" o "rejected"');
    }
  }

  /**
   * Obtener lista de amigos (aceptados)
   */
  async getFriends(userId: string): Promise<FriendDTO[]> {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        user: {
          include: { profile: true },
        },
        friend: {
          include: { profile: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Mapear para que siempre retorne el amigo (no el usuario actual)
    return friends.map((f) => {
      const friendUser = f.userId === userId ? f.friend : f.user;
      return {
        id: f.id,
        userId: f.userId,
        friendId: f.friendId,
        status: f.status as 'pending' | 'accepted' | 'blocked',
        friend: this.mapUserToFriendUserDTO(friendUser),
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Eliminar amigo
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Buscar la relación (puede estar en cualquier dirección)
    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundError('Amistad no encontrada');
    }

    // Eliminar la relación
    await prisma.friend.delete({
      where: { id: friendship.id },
    });
  }

  /**
   * Obtener sugerencias de amigos
   */
  async getFriendSuggestions(userId: string, limit: number = 10): Promise<FriendSuggestionDTO[]> {
    // Obtener IDs de usuarios que ya son amigos o tienen solicitud pendiente
    const existingRelations = await prisma.friend.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
      },
      select: {
        userId: true,
        friendId: true,
      },
    });

    const excludedUserIds = new Set([
      userId,
      ...existingRelations.map((r) => (r.userId === userId ? r.friendId : r.userId)),
    ]);

    // Obtener intereses del usuario (categorías)
    const userInterests = await prisma.userCategoryInterest.findMany({
      where: { userId },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    const userCategoryIds = userInterests.map((i) => i.categoryId);
    const userCategoryMap = new Map(
      userInterests.map((i) => [i.categoryId, i.category.name])
    );

    // Obtener actividades del usuario desde PersonalInformation
    const userPersonalInfo = await prisma.personalInformation.findUnique({
      where: { userId },
      select: { metadata: true },
    });

    const userActivities: string[] =
      ((userPersonalInfo?.metadata as any)?.onboarding?.activities as string[]) || [];

    // Sugerencias basadas en intereses similares (categorías)
    const suggestionsByInterests: FriendSuggestionDTO[] = [];

    if (userCategoryIds.length > 0) {
      const usersWithSimilarInterests = await prisma.userCategoryInterest.findMany({
        where: {
          categoryId: { in: userCategoryIds },
          userId: { notIn: Array.from(excludedUserIds) },
        },
        include: {
          user: {
            include: { profile: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
        distinct: ['userId'],
      });

      // Agrupar por usuario y calcular categorías comunes
      const userInterestsMap = new Map<string, { user: any; commonCategories: string[] }>();

      for (const interest of usersWithSimilarInterests) {
        if (!excludedUserIds.has(interest.userId)) {
          const existing = userInterestsMap.get(interest.userId);
          if (existing) {
            existing.commonCategories.push(interest.category.name);
          } else {
            userInterestsMap.set(interest.userId, {
              user: interest.user,
              commonCategories: [interest.category.name],
            });
          }
        }
      }

      // Obtener actividades de cada usuario sugerido y calcular actividades comunes
      // También calcular amigos mutuos para cada sugerencia
      for (const [suggestedUserId, data] of userInterestsMap.entries()) {
        const suggestedUserPersonalInfo = await prisma.personalInformation.findUnique({
          where: { userId: suggestedUserId },
          select: { metadata: true },
        });

        const suggestedUserActivities: string[] =
          ((suggestedUserPersonalInfo?.metadata as any)?.onboarding?.activities as string[]) || [];

        const commonActivities = userActivities.filter((activity) =>
          suggestedUserActivities.includes(activity)
        );

        // Calcular amigos mutuos
        const mutualFriends = await prisma.friend.findMany({
          where: {
            OR: [
              { userId: userId, friendId: suggestedUserId, status: 'accepted' },
              { userId: suggestedUserId, friendId: userId, status: 'accepted' },
            ],
          },
        });

        // Obtener amigos del usuario sugerido
        const suggestedUserFriends = await prisma.friend.findMany({
          where: {
            OR: [
              { userId: suggestedUserId, status: 'accepted' },
              { friendId: suggestedUserId, status: 'accepted' },
            ],
            NOT: {
              OR: [
                { userId: userId },
                { friendId: userId },
              ],
            },
          },
          select: {
            userId: true,
            friendId: true,
          },
        });

        // Obtener amigos del usuario actual
        const currentUserFriends = await prisma.friend.findMany({
          where: {
            OR: [
              { userId: userId, status: 'accepted' },
              { friendId: userId, status: 'accepted' },
            ],
          },
          select: {
            userId: true,
            friendId: true,
          },
        });

        const currentUserFriendIds = new Set(
          currentUserFriends.map((f) => (f.userId === userId ? f.friendId : f.userId))
        );
        const suggestedUserFriendIds = new Set(
          suggestedUserFriends.map((f) => (f.userId === suggestedUserId ? f.friendId : f.userId))
        );

        const mutualFriendIds: string[] = [];
        currentUserFriendIds.forEach((friendId) => {
          if (suggestedUserFriendIds.has(friendId)) {
            mutualFriendIds.push(friendId);
          }
        });
        const mutualFriendsCount = mutualFriendIds.length;
        let mutualFriendNames: string[] | undefined = undefined;
        if (mutualFriendsCount > 0) {
          const mutualUsers = await prisma.user.findMany({
            where: { id: { in: mutualFriendIds } },
            select: { firstName: true, lastName: true },
          });
          mutualFriendNames = mutualUsers.map(
            (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Amigo'
          );
        }

        excludedUserIds.add(suggestedUserId);
        suggestionsByInterests.push({
          userId: suggestedUserId,
          user: this.mapUserToFriendUserDTO(data.user),
          reason: commonActivities.length > 0 ? 'similar_interests' : 'similar_interests',
          commonCategories: data.commonCategories,
          commonActivities: commonActivities.length > 0 ? commonActivities : undefined,
          mutualFriendsCount: mutualFriendsCount > 0 ? mutualFriendsCount : undefined,
          mutualFriendNames,
        });
      }
    }

    // Sugerencias basadas en actividades similares (independiente de categorías)
    const suggestionsByActivities: FriendSuggestionDTO[] = [];

    if (userActivities.length > 0) {
      // Obtener todos los usuarios con PersonalInformation (excepto excluidos)
      // Filtrar en memoria porque Prisma no tiene array_contains para JSON
      const allUsersWithPersonalInfo = await prisma.personalInformation.findMany({
        where: {
          userId: { notIn: Array.from(excludedUserIds) },
          metadata: { not: Prisma.JsonNull },
        },
        include: {
          user: {
            include: { profile: true },
          },
        },
        take: 100, // Limitar para no sobrecargar
      });

      // Filtrar usuarios que tienen actividades en común
      const usersWithCommonActivities = allUsersWithPersonalInfo.filter((personalInfo) => {
        const suggestedUserActivities: string[] =
          ((personalInfo.metadata as any)?.onboarding?.activities as string[]) || [];
        return userActivities.some((activity) => suggestedUserActivities.includes(activity));
      });

      // Procesar usuarios con actividades comunes
      for (const personalInfo of usersWithCommonActivities.slice(
        0,
        limit - suggestionsByInterests.length
      )) {
        const suggestedUserActivities: string[] =
          ((personalInfo.metadata as any)?.onboarding?.activities as string[]) || [];

        const commonActivities = userActivities.filter((activity) =>
          suggestedUserActivities.includes(activity)
        );

        if (commonActivities.length > 0 && !excludedUserIds.has(personalInfo.userId)) {
          excludedUserIds.add(personalInfo.userId);

          // Obtener categorías comunes si tiene
          const suggestedUserInterests = await prisma.userCategoryInterest.findMany({
            where: { userId: personalInfo.userId },
            include: {
              category: {
                select: { id: true, name: true },
              },
            },
          });

          const commonCategories = suggestedUserInterests
            .filter((i) => userCategoryIds.includes(i.categoryId))
            .map((i) => i.category.name);

          // Calcular amigos mutuos
          const suggestedUserFriends = await prisma.friend.findMany({
            where: {
              OR: [
                { userId: personalInfo.userId, status: 'accepted' },
                { friendId: personalInfo.userId, status: 'accepted' },
              ],
              NOT: {
                OR: [
                  { userId: userId },
                  { friendId: userId },
                ],
              },
            },
            select: {
              userId: true,
              friendId: true,
            },
          });

          const currentUserFriends = await prisma.friend.findMany({
            where: {
              OR: [
                { userId: userId, status: 'accepted' },
                { friendId: userId, status: 'accepted' },
              ],
            },
            select: {
              userId: true,
              friendId: true,
            },
          });

          const currentUserFriendIds = new Set(
            currentUserFriends.map((f) => (f.userId === userId ? f.friendId : f.userId))
          );
          const suggestedUserFriendIds = new Set(
            suggestedUserFriends.map((f) => (f.userId === personalInfo.userId ? f.friendId : f.userId))
          );

          const mutualFriendIds: string[] = [];
          currentUserFriendIds.forEach((friendId) => {
            if (suggestedUserFriendIds.has(friendId)) {
              mutualFriendIds.push(friendId);
            }
          });

          let mutualFriendsCount = mutualFriendIds.length;
          let mutualFriendNames: string[] | undefined = undefined;
          if (mutualFriendsCount > 0) {
            const mutualUsers = await prisma.user.findMany({
              where: { id: { in: mutualFriendIds } },
              select: { firstName: true, lastName: true },
            });
            mutualFriendNames = mutualUsers.map(
              (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Amigo'
            );
          }

          suggestionsByActivities.push({
            userId: personalInfo.userId,
            user: this.mapUserToFriendUserDTO(personalInfo.user!),
            reason: 'similar_activities',
            commonCategories: commonCategories.length > 0 ? commonCategories : undefined,
            commonActivities: commonActivities,
            mutualFriendsCount: mutualFriendsCount > 0 ? mutualFriendsCount : undefined,
            mutualFriendNames,
          });
        }
      }
    }

    // Sugerencias basadas en amigos mutuos
    const suggestionsByMutualFriends: FriendSuggestionDTO[] = [];

    // Obtener amigos del usuario
    const userFriends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      select: {
        userId: true,
        friendId: true,
      },
    });

    const friendIds = userFriends.map((f) => (f.userId === userId ? f.friendId : f.userId));

    if (friendIds.length > 0) {
      // Obtener amigos de mis amigos que no son mis amigos
      const friendsOfFriends = await prisma.friend.findMany({
        where: {
          OR: [
            { userId: { in: friendIds }, status: 'accepted' },
            { friendId: { in: friendIds }, status: 'accepted' },
          ],
        },
        include: {
          user: {
            include: { profile: true },
          },
          friend: {
            include: { profile: true },
          },
        },
      });

      const mutualFriendsMap = new Map<string, { user: any; count: number }>();

      for (const fof of friendsOfFriends) {
        const potentialFriendId = fof.userId === userId || friendIds.includes(fof.userId)
          ? fof.friendId
          : fof.userId;

        if (potentialFriendId !== userId && !excludedUserIds.has(potentialFriendId)) {
          const friendUser = fof.userId === potentialFriendId ? fof.user : fof.friend;
          const current = mutualFriendsMap.get(potentialFriendId);
          if (current) {
            current.count++;
          } else {
            mutualFriendsMap.set(potentialFriendId, {
              user: friendUser,
              count: 1,
            });
          }
        }
      }

      for (const [friendId, data] of mutualFriendsMap.entries()) {
        suggestionsByMutualFriends.push({
          userId: friendId,
          user: this.mapUserToFriendUserDTO(data.user),
          reason: 'mutual_friends',
          mutualFriendsCount: data.count,
        });
      }
    }

    // Combinar y ordenar sugerencias
    const allSuggestions = [...suggestionsByMutualFriends, ...suggestionsByInterests, ...suggestionsByActivities].slice(0, limit);

    return allSuggestions;
  }

  /**
   * Cancelar solicitud enviada
   */
  async cancelSentRequest(requestId: string, userId: string): Promise<void> {
    const request = await prisma.friend.findUnique({
      where: { id: requestId },
      include: {
        friend: {
          include: { profile: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    // Verificar que el usuario es el remitente
    if (request.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para cancelar esta solicitud');
    }

    // Verificar que la solicitud está pendiente
    if (request.status !== 'pending') {
      throw new BadRequestError('La solicitud ya fue procesada');
    }

    // Eliminar la solicitud
    await prisma.friend.delete({
      where: { id: requestId },
    });

    // Eliminar notificación asociada si existe
    try {
      await prisma.notification.deleteMany({
        where: {
          userId: request.friendId,
          type: 'friend_request',
          data: {
            path: ['friendRequestId'],
            equals: requestId,
          },
        },
      });
    } catch (error) {
      // Si falla, no es crítico
      console.error('Error eliminando notificación de solicitud cancelada:', error);
    }
  }

  /**
   * Bloquear usuario
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    if (userId === blockedUserId) {
      throw new BadRequestError('No puedes bloquearte a ti mismo');
    }

    // Verificar si ya existe una relación
    const existingRelationship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId: blockedUserId },
          { userId: blockedUserId, friendId: userId },
        ],
      },
    });

    if (existingRelationship) {
      // Si existe, actualizar el estado a 'blocked'
      await prisma.friend.update({
        where: { id: existingRelationship.id },
        data: { status: 'blocked' },
      });
    } else {
      // Si no existe, crear una nueva relación con estado 'blocked'
      await prisma.friend.create({
        data: {
          userId,
          friendId: blockedUserId,
          status: 'blocked',
        },
      });
    }
  }

  /**
   * Desbloquear usuario
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const blockedRelationship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId: blockedUserId, status: 'blocked' },
          { userId: blockedUserId, friendId: userId, status: 'blocked' },
        ],
      },
    });

    if (!blockedRelationship) {
      throw new NotFoundError('Usuario no está bloqueado');
    }

    // Verificar que el usuario que desbloquea es quien bloqueó
    if (blockedRelationship.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para desbloquear este usuario');
    }

    // Eliminar la relación de bloqueo
    await prisma.friend.delete({
      where: { id: blockedRelationship.id },
    });
  }

  /**
   * Obtener usuarios bloqueados
   */
  async getBlockedUsers(userId: string): Promise<any[]> {
    const blockedRelationships = await prisma.friend.findMany({
      where: {
        userId,
        status: 'blocked',
      },
      include: {
        friend: {
          include: { profile: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return blockedRelationships.map((blocked) => ({
      id: blocked.id,
      userId: blocked.userId,
      blockedUserId: blocked.friendId,
      blockedUser: this.mapUserToFriendUserDTO(blocked.friend),
      createdAt: blocked.createdAt.toISOString(),
    }));
  }
}

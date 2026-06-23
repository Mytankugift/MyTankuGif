/**
 * Friends Service
 * 
 * Servicio para gestionar relaciones de amistad entre usuarios
 */

import { prisma } from '../../config/database';
import {
  getFriendAcceptedCopy,
} from '../notifications/friend-notification-copy';
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
   * Añade `mutualFriendsCount` entre el viewer y cada amigo (intersección de listas de aceptados).
   */
  private async enrichFriendsWithMutualCounts(
    viewerId: string,
    friendsList: FriendDTO[],
  ): Promise<FriendDTO[]> {
    if (friendsList.length === 0) return friendsList;

    const candidateIds = friendsList.map((d) => d.friendId);

    const myAccepted = await prisma.friend.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId: viewerId }, { friendId: viewerId }],
      },
      select: { userId: true, friendId: true },
    });
    const myFriendSet = new Set(
      myAccepted
        .map((r) => (r.userId === viewerId ? r.friendId : r.userId))
        .filter((id) => id !== viewerId),
    );

    const edgeRows = await prisma.friend.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId: { in: candidateIds } }, { friendId: { in: candidateIds } }],
      },
      select: { userId: true, friendId: true },
    });

    const neighborMap = new Map<string, Set<string>>();
    for (const id of candidateIds) {
      neighborMap.set(id, new Set<string>());
    }
    const addNeighbors = (endpoint: string, other: string) => {
      if (neighborMap.has(endpoint) && other !== endpoint) neighborMap.get(endpoint)!.add(other);
    };
    for (const row of edgeRows) {
      addNeighbors(row.userId, row.friendId);
      addNeighbors(row.friendId, row.userId);
    }

    return friendsList.map((d) => {
      let mutual = 0;
      const neigh = neighborMap.get(d.friendId);
      if (neigh?.size && myFriendSet.size) {
        for (const u of myFriendSet) {
          if (u !== d.friendId && neigh.has(u)) mutual++;
        }
      }
      return { ...d, mutualFriendsCount: mutual };
    });
  }

  /**
   * Mapear usuario a FriendUserDTO
   */
  private mapUserToFriendUserDTO(user: any): FriendUserDTO {
    const birthDate =
      user.personalInfo?.birthDate != null
        ? (user.personalInfo.birthDate as Date).toISOString()
        : null;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username || null,
      email: user.email,
      birthDate,
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
        if (existingFriend.userId === userId) {
          const pending = await prisma.friend.findUnique({
            where: { id: existingFriend.id },
            include: {
              friend: { include: { profile: true } },
              user: { include: { profile: true } },
            },
          });
          if (pending) {
            return this.mapFriendToDTO(pending);
          }
        }
        throw new ConflictError('Ya existe una solicitud pendiente');
      }
      if (existingFriend.status === 'blocked') {
        throw new ConflictError('No puedes enviar solicitud a este usuario');
      }
    }

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

    // Sincronizar notificación para el usuario destino (individual o digest según pendientes)
    try {
      await this.notificationsService.syncFriendRequestNotifications({
        recipientUserId: friendId,
        bump: true,
      });
    } catch (error) {
      console.error('Error sincronizando notificación de solicitud de amistad:', error);
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

      // Quitar la solicitud pendiente del destinatario (ya la resolvió)
      try {
        await this.notificationsService.removeFriendRequestNotifications(request.friendId, {
          friendRequestId: requestId,
          fromUserId: request.userId,
        });
        await this.notificationsService.syncFriendRequestNotifications({
          recipientUserId: request.friendId,
          bump: false,
        });
      } catch (error) {
        console.error('Error eliminando notificación de solicitud aceptada:', error);
      }

      // Notificación agrupada para quien envió la solicitud (una fila por persona)
      try {
        const { title, message } = getFriendAcceptedCopy(request.friend);
        await this.notificationsService.syncFriendAcceptedNotification({
          recipientUserId: request.userId,
          acceptedByUserId: userId,
          title,
          message,
          data: {
            friendId: userId,
            actorId: userId,
            friendRequestId: requestId,
            friendUsername: request.friend.username,
            friendAvatar: request.friend.profile?.avatar ?? null,
          },
        });
      } catch (error) {
        // Si falla la notificación, no fallar la aceptación
        console.error('Error creando notificación de amistad aceptada:', error);
      }

      return this.mapFriendToDTO(updated);
    } else if (status === 'rejected') {
      try {
        await this.notificationsService.removeFriendRequestNotifications(request.friendId, {
          friendRequestId: requestId,
          fromUserId: request.userId,
        });
        await this.notificationsService.syncFriendRequestNotifications({
          recipientUserId: request.friendId,
          bump: false,
        });
      } catch (error) {
        console.error('Error eliminando notificación de solicitud rechazada:', error);
      }

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
          include: {
            profile: true,
            personalInfo: { select: { birthDate: true } },
          },
        },
        friend: {
          include: {
            profile: true,
            personalInfo: { select: { birthDate: true } },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const base = friends.map((f) => {
      const friendUser = f.userId === userId ? f.friend : f.user;
      const correctFriendId = f.userId === userId ? f.friendId : f.userId;
      return {
        id: f.id,
        userId: f.userId,
        friendId: correctFriendId,
        status: f.status as 'pending' | 'accepted' | 'blocked',
        friend: this.mapUserToFriendUserDTO(friendUser),
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      };
    });

    return this.enrichFriendsWithMutualCounts(userId, base);
  }

  /**
   * Eliminar amigo
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    // ✅ Eliminada validación incorrecta - los IDs de usuario también pueden empezar con "cmm" (cuid genera IDs aleatorios)
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

    try {
      await this.notificationsService.removeFriendAcceptedBetweenUsers(userId, friendId);
    } catch (error) {
      console.error('Error eliminando notificaciones de amistad aceptada:', error);
    }
  }

  /**
   * Obtener sugerencias de amigos
   */
  async getFriendSuggestions(userId: string, limit: number = 10): Promise<FriendSuggestionDTO[]> {
    // Excluir: yo, amigos aceptados, bloqueados y solicitudes que ME enviaron (van al tab solicitudes).
    // No excluir solicitudes que YO envié: siguen en sugerencias con opción de cancelar.
    const existingRelations = await prisma.friend.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
      },
      select: {
        userId: true,
        friendId: true,
        status: true,
      },
    });

    const excludedUserIds = new Set<string>([userId]);
    for (const relation of existingRelations) {
      const otherUserId =
        relation.userId === userId ? relation.friendId : relation.userId;

      if (relation.status === 'accepted' || relation.status === 'blocked') {
        excludedUserIds.add(otherUserId);
        continue;
      }

      if (relation.status === 'pending' && relation.friendId === userId) {
        excludedUserIds.add(relation.userId);
      }
    }

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

    const combined: FriendSuggestionDTO[] = [
      ...suggestionsByMutualFriends,
      ...suggestionsByInterests,
      ...suggestionsByActivities,
    ];

    const mutualScore = (s: FriendSuggestionDTO) =>
      typeof s.mutualFriendsCount === 'number' && s.mutualFriendsCount >= 0
        ? s.mutualFriendsCount
        : 0;

    const byUserId = new Map<string, FriendSuggestionDTO>();
    for (const s of combined) {
      const prev = byUserId.get(s.userId);
      if (!prev || mutualScore(s) > mutualScore(prev)) {
        byUserId.set(s.userId, s);
      }
    }

    const ranked = [...byUserId.values()].sort((a, b) => {
      const d = mutualScore(b) - mutualScore(a);
      if (d !== 0) return d;
      if (a.reason === 'mutual_friends' && b.reason !== 'mutual_friends') return -1;
      if (b.reason === 'mutual_friends' && a.reason !== 'mutual_friends') return 1;
      const ua = `${a.user.username ?? ''} ${a.user.firstName ?? ''}`;
      const ub = `${b.user.username ?? ''} ${b.user.firstName ?? ''}`;
      return ua.localeCompare(ub, undefined, { sensitivity: 'base' });
    });

    return ranked.slice(0, limit);
  }

  /**
   * Texto de búsqueda /friends: username; nombre o apellido parcial; con 2+ palabras también
   * `firstName` contiene la 1ª palabra y `lastName` contiene el resto (ej. "Ana María García").
   */
  private buildFriendsSearchTextMatch(q: string): Prisma.UserWhereInput {
    const or: Prisma.UserWhereInput[] = [
      { username: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { firstName: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { lastName: { contains: q, mode: Prisma.QueryMode.insensitive } },
    ];
    const tokens = q.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length >= 2) {
      const firstTok = tokens[0];
      const lastRest = tokens.slice(1).join(' ');
      if (firstTok.length >= 1 && lastRest.length >= 1) {
        or.push({
          AND: [
            { firstName: { contains: firstTok, mode: Prisma.QueryMode.insensitive } },
            { lastName: { contains: lastRest, mode: Prisma.QueryMode.insensitive } },
          ],
        });
      }
    }
    return { OR: or };
  }

  /**
   * Buscar usuarios por @username, nombre/apellido o nombre + apellido (varias palabras).
   * Incluye cualquier edad con fecha en perfil (alineado con sugerencias; no filtrar menores aquí).
   * Excluye solo: tú mismo y relaciones **bloqueadas**.
   */
  async searchUsersForFriends(
    userId: string,
    rawQuery: string,
    limit: number = 24
  ): Promise<FriendSuggestionDTO[]> {
    const q = rawQuery.trim();
    if (q.length < 2) {
      return [];
    }

    const cappedLimit = Math.min(Math.max(limit, 1), 50);

    const blockedRelations = await prisma.friend.findMany({
      where: {
        AND: [
          { OR: [{ userId }, { friendId: userId }] },
          { status: 'blocked' },
        ],
      },
      select: {
        userId: true,
        friendId: true,
      },
    });

    const excludedUserIds = new Set<string>([userId]);
    for (const r of blockedRelations) {
      excludedUserIds.add(r.userId === userId ? r.friendId : r.userId);
    }

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludedUserIds) },
        ...this.buildFriendsSearchTextMatch(q),
      },
      include: {
        profile: true,
        personalInfo: { select: { birthDate: true } },
      },
      take: cappedLimit,
      orderBy: [{ username: 'asc' }, { id: 'asc' }],
    });

    return users.map((u) => ({
      userId: u.id,
      user: this.mapUserToFriendUserDTO(u),
      reason: 'search_match',
    }));
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
      await this.notificationsService.removeFriendRequestNotifications(request.friendId, {
        friendRequestId: requestId,
        fromUserId: userId,
      });
      await this.notificationsService.syncFriendRequestNotifications({
        recipientUserId: request.friendId,
        bump: false,
      });
    } catch (error) {
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
   * Verificar si un usuario está bloqueado por otro
   * Retorna true si userId bloqueó a otherUserId O si otherUserId bloqueó a userId
   */
  async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    if (userId === otherUserId) {
      return false; // No se puede bloquear a uno mismo
    }

    const blocked = await prisma.friend.findFirst({
      where: {
        status: 'blocked',
        OR: [
          { userId, friendId: otherUserId },
          { userId: otherUserId, friendId: userId },
        ],
      },
    });

    return !!blocked;
  }

  /**
   * Obtener lista de IDs de usuarios bloqueados por un usuario
   * Más eficiente para filtros en batch queries
   */
  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocked = await prisma.friend.findMany({
      where: {
        userId,
        status: 'blocked',
      },
      select: {
        friendId: true,
      },
    });

    return blocked.map(b => b.friendId);
  }

  /**
   * Obtener lista de IDs de usuarios que bloquearon a un usuario
   * Útil para verificar si el usuario actual está bloqueado por otros
   */
  async getBlockedByUserIds(userId: string): Promise<string[]> {
    const blocked = await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: 'blocked',
      },
      select: {
        userId: true,
      },
    });

    return blocked.map(b => b.userId);
  }
}

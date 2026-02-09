import { prisma } from '../../config/database';
import { S3Service } from '../../shared/services/s3.service';
import { PosterDTO, PosterAuthorDTO } from '../../shared/dto/posters.dto';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError';
import { FeedService } from '../feed/feed.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import type { Poster, PosterComment, PosterReaction, User, UserProfile } from '@prisma/client';

export class PostersService {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  // ==================== MAPPERS ====================

  /**
   * Mapper: User + UserProfile a PosterAuthorDTO
   */
  private mapUserToPosterAuthorDTO(user: User & { profile: UserProfile | null }): PosterAuthorDTO {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username || null,
      avatar: user.profile?.avatar || null,
    };
  }

  /**
   * Mapper: PosterComment de Prisma a PosterCommentDTO
   */
  private mapCommentToDTO(
    comment: PosterComment & { customer: User & { profile: UserProfile | null } }
  ): any {
    return {
      id: comment.id,
      posterId: comment.posterId,
      userId: comment.customerId,
      content: comment.content,
      parentId: comment.parentId,
      likesCount: comment.likesCount,
      createdAt: comment.createdAt.toISOString(),
      author: this.mapUserToPosterAuthorDTO(comment.customer),
      mentions: comment.mentions ? (comment.mentions as string[]) : undefined,
    };
  }

  /**
   * Mapper: Poster de Prisma a PosterDTO
   */
  private mapPosterToDTO(
    poster: Poster & {
      customer: User & { profile: UserProfile | null };
      reactions: PosterReaction[];
      comments: (PosterComment & { customer: User & { profile: UserProfile | null } })[];
    },
    currentUserId?: string
  ): PosterDTO {
    // Verificar si el usuario actual le dio like
    const isLiked = currentUserId
      ? poster.reactions.some(r => r.customerId === currentUserId)
      : false;

    return {
      id: poster.id,
      imageUrl: poster.imageUrl,
      videoUrl: poster.videoUrl,
      description: poster.description,
      likesCount: poster.likesCount,
      commentsCount: poster.commentsCount,
      createdAt: poster.createdAt.toISOString(),
      author: this.mapUserToPosterAuthorDTO(poster.customer),
      isLiked,
      comments: poster.comments?.map(c => this.mapCommentToDTO(c)),
    };
  }

  // ==================== MÉTODOS NORMALIZADOS ====================

  /**
   * Obtener feed de posters del usuario autenticado
   * 
   * @param userId ID del usuario
   * @param sort Ordenamiento: 'date' (por fecha, default) o 'popular' (por ranking/relevancia)
   */
  async getFeedPoster(userId: string, sort: 'date' | 'popular' = 'date'): Promise<PosterDTO[]> {
    try {
      // Verificar que las tablas existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM posters LIMIT 1`.catch(() => {
          throw new Error('Tabla posters no existe');
        });
      } catch (tableError: any) {
        return [];
      }

      // Si es por relevancia, usar ranking global
      if (sort === 'popular') {
        const rankingItems = await prisma.globalRanking.findMany({
          where: {
            itemType: 'poster',
          },
          orderBy: [
            { globalScore: 'desc' },
            { createdAt: 'desc' },
          ],
          take: 20,
        });

        // Obtener posters completos
        const posterIds = rankingItems.map((item) => item.itemId);
        if (posterIds.length === 0) {
          return [];
        }

        const posters = await prisma.poster.findMany({
          where: {
            id: { in: posterIds },
            isActive: true,
          },
          include: {
            customer: {
              include: {
                profile: true,
              },
            },
            reactions: true,
            comments: {
              where: { isActive: true },
              take: 5,
              include: {
                customer: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        });

        // Ordenar según el orden del ranking
        const posterMap = new Map(posters.map((p) => [p.id, p]));
        const orderedPosters = rankingItems
          .map((item) => posterMap.get(item.itemId))
          .filter((p): p is typeof posters[0] => p !== undefined);

        return orderedPosters.map((poster) => this.mapPosterToDTO(poster));
      }

      // Por defecto: ordenar por fecha (más recientes primero)
      const posters = await prisma.poster.findMany({
        where: {
          customerId: userId,
          isActive: true,
        },
        include: {
          customer: {
            include: {
              profile: true,
            },
          },
          reactions: true,
          comments: {
            where: { isActive: true },
            take: 5,
            include: {
              customer: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return posters.map((poster) => this.mapPosterToDTO(poster, userId));
    } catch (error: any) {
      console.error(`❌ [POSTERS SERVICE] Error obteniendo feed:`, error.message);
      return [];
    }
  }

  /**
   * Obtener posters de un usuario específico
   */
  async getPostersByUserId(userId: string): Promise<PosterDTO[]> {
    try {
      // Verificar que las tablas existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM posters LIMIT 1`.catch(() => {
          throw new Error('Tabla posters no existe');
        });
      } catch (tableError: any) {
        return [];
      }

      const posters = await prisma.poster.findMany({
        where: {
          customerId: userId,
          isActive: true,
        },
        include: {
          customer: {
            include: {
              profile: true,
            },
          },
          reactions: true,
          comments: {
            where: { isActive: true },
            take: 5,
            include: {
              customer: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return posters.map((poster) => this.mapPosterToDTO(poster, userId));
    } catch (error: any) {
      console.error(`❌ [POSTERS SERVICE] Error obteniendo posters:`, error.message);
      return [];
    }
  }

  /**
   * Obtener un poster específico por ID (sin comentarios para carga rápida)
   */
  async getPosterById(posterId: string, currentUserId?: string, includeComments: boolean = false): Promise<PosterDTO> {
    const poster = await prisma.poster.findUnique({
      where: { id: posterId },
      include: {
        customer: {
          include: {
            profile: true,
          },
        },
        reactions: true,
        comments: includeComments ? {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 50, // Limitar a 50 comentarios iniciales
          include: {
            customer: {
              include: {
                profile: true,
              },
            },
          },
        } : false,
      },
    });

    if (!poster) {
      throw new NotFoundError('Poster no encontrado');
    }

    return this.mapPosterToDTO(poster as any, currentUserId);
  }

  /**
   * Obtener comentarios de un poster (paginados)
   */
  async getPosterComments(
    posterId: string,
    page: number = 0,
    limit: number = 20
  ): Promise<{
    comments: Array<{
      id: string;
      userId: string;
      content: string;
      parentId: string | null;
      likesCount: number;
      createdAt: string;
      author: PosterAuthorDTO;
    }>;
    hasMore: boolean;
    total: number;
  }> {
    const skip = page * limit;

    const [comments, total] = await Promise.all([
      prisma.posterComment.findMany({
        where: {
          posterId,
          isActive: true,
          parentId: null, // Solo comentarios principales
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          customer: {
            include: {
              profile: true,
            },
          },
          replies: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            include: {
              customer: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      }),
      prisma.posterComment.count({
        where: {
          posterId,
          isActive: true,
        },
      }),
    ]);

    // Formatear comentarios con menciones
    const formattedComments = await Promise.all(
      comments.map(async (comment) => {
        // Procesar mentions si existen
        let mentionsArray: string[] | undefined = undefined;
        if (comment.mentions) {
          try {
            if (Array.isArray(comment.mentions)) {
              mentionsArray = comment.mentions as string[];
            } else if (typeof comment.mentions === 'string') {
              mentionsArray = JSON.parse(comment.mentions);
            }
          } catch (e) {
            console.error('Error parsing mentions:', e);
          }
        }

        // Formatear contenido del comentario (reemplazar @{userId} con nombres)
        const formattedContent = await this.formatCommentContent(
          comment.content,
          mentionsArray
        );

        // Procesar replies (respuestas)
        const repliesArray = await Promise.all(
          (comment.replies || []).map(async (reply) => {
            let replyMentions: string[] | undefined = undefined;
            if (reply.mentions) {
              try {
                if (Array.isArray(reply.mentions)) {
                  replyMentions = reply.mentions as string[];
                } else if (typeof reply.mentions === 'string') {
                  replyMentions = JSON.parse(reply.mentions);
                }
              } catch (e) {
                console.error('Error parsing reply mentions:', e);
              }
            }

            // Formatear contenido de la respuesta
            const formattedReplyContent = await this.formatCommentContent(
              reply.content,
              replyMentions
            );

            return {
              id: reply.id,
              userId: reply.customerId,
              content: formattedReplyContent,
              parentId: reply.parentId,
              likesCount: reply.likesCount,
              createdAt: reply.createdAt.toISOString(),
              author: this.mapUserToPosterAuthorDTO(reply.customer),
              mentions: replyMentions,
            };
          })
        );

        return {
          id: comment.id,
          userId: comment.customerId,
          content: formattedContent,
          parentId: comment.parentId,
          likesCount: comment.likesCount,
          createdAt: comment.createdAt.toISOString(),
          author: this.mapUserToPosterAuthorDTO(comment.customer),
          mentions: mentionsArray,
          replies: repliesArray,
        };
      })
    );

    return {
      comments: formattedComments,
      hasMore: skip + comments.length < total,
      total,
    };
  }

  /**
   * Crear un nuevo poster
   */
  async createPoster(data: {
    userId: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    videoUrl?: string;
  }): Promise<PosterDTO> {
    // Validar que al menos haya título o descripción
    if (!data.title?.trim() && !data.description?.trim()) {
      throw new BadRequestError('Se requiere al menos un título o descripción');
    }

    // Validar que haya al menos una imagen o video
    if (!data.imageUrl && !data.videoUrl) {
      throw new BadRequestError('Se requiere al menos una imagen o video');
    }

    const poster = await prisma.poster.create({
      data: {
        customerId: data.userId,
        title: data.title || null,
        description: data.description || null,
        imageUrl: data.imageUrl || '',
        videoUrl: data.videoUrl || null,
        likesCount: 0,
        commentsCount: 0,
        isActive: true,
      },
      include: {
        customer: {
          include: {
            profile: true,
          },
        },
        reactions: true,
        comments: {
          where: { isActive: true },
          take: 5,
          include: {
            customer: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    const posterDTO = this.mapPosterToDTO(poster);

    // Inicializar métricas del feed para el nuevo poster (asíncrono, no bloquea)
    const feedService = new FeedService();
    feedService.initializeItemMetrics(poster.id, 'poster').catch((error) => {
      console.error(`Error inicializando métricas del feed para poster ${poster.id}:`, error);
    });

    return posterDTO;
  }

  /**
   * Toggle reacción (like/unlike) en un poster
   */
  async toggleReaction(posterId: string, userId: string, reactionType: string = 'like'): Promise<{ liked: boolean }> {
    // Verificar que el poster existe
    const poster = await prisma.poster.findUnique({
      where: { id: posterId },
    });

    if (!poster) {
      throw new NotFoundError('Poster no encontrado');
    }

    // Buscar si ya existe una reacción
    const existingReaction = await prisma.posterReaction.findUnique({
      where: {
        posterId_customerId: {
          posterId,
          customerId: userId,
        },
      },
    });

    if (existingReaction) {
      // Eliminar reacción (unlike)
      await prisma.posterReaction.delete({
        where: { id: existingReaction.id },
      });

      // Decrementar contador
      const updatedPoster = await prisma.poster.update({
        where: { id: posterId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
      });

      // Actualizar métricas del feed (con debouncing)
      const feedService = new FeedService();
      feedService.updateItemMetricsDebounced(posterId, 'poster', {
        likesCount: updatedPoster.likesCount,
      });

      return { liked: false };
    } else {
      // Crear reacción (like)
      await prisma.posterReaction.create({
        data: {
          posterId,
          customerId: userId,
          reactionType,
        },
      });

      // Incrementar contador
      const updatedPoster = await prisma.poster.update({
        where: { id: posterId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });

      // Actualizar métricas del feed (con debouncing)
      const feedService = new FeedService();
      feedService.updateItemMetricsDebounced(posterId, 'poster', {
        likesCount: updatedPoster.likesCount,
      });

      // Crear notificación si el usuario que dio like no es el dueño del post
      if (poster.customerId !== userId) {
        try {
          const notificationsService = new NotificationsService();
          const posterAuthor = await prisma.user.findUnique({
            where: { id: poster.customerId },
            select: { firstName: true, lastName: true, email: true },
          });
          
          const likerName = await prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, email: true },
          });

          const likerDisplayName = likerName?.firstName && likerName?.lastName
            ? `${likerName.firstName} ${likerName.lastName}`
            : likerName?.email?.split('@')[0] || 'Alguien';

          await notificationsService.createNotification({
            userId: poster.customerId,
            type: 'post_like',
            title: 'Nuevo like en tu publicación',
            message: `${likerDisplayName} le dio like a tu publicación`,
            data: {
              posterId,
              fromUserId: userId,
              type: 'post_like',
            },
          });
        } catch (notifError: any) {
          // No fallar si la notificación no se puede crear
          console.error(`Error creando notificación de like:`, notifError?.message);
        }
      }

      return { liked: true };
    }
  }

  /**
   * Extraer menciones del texto (formato: @displayName|userId)
   * El frontend envía menciones como @displayName|userId para mostrar nombre pero guardar ID
   * Retorna array de userIds mencionados
   */
  /**
   * Formatear contenido de comentario reemplazando @{userId} con nombres actuales
   */
  private async formatCommentContent(content: string, mentionedUserIds?: string[]): Promise<string> {
    if (!content) return content;

    // Si no hay menciones, devolver el contenido tal cual
    if (!mentionedUserIds || mentionedUserIds.length === 0) {
      return content;
    }

    // Obtener información de usuarios mencionados
    const users = await prisma.user.findMany({
      where: { id: { in: mentionedUserIds } },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        username: true 
      },
    });

    let formattedContent = content;

    // Reemplazar cada marcador @{userId} con el nombre actual del usuario
    users.forEach(user => {
      const displayName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : (user.username || 'Usuario');
      
      // Reemplazar todos los marcadores de este usuario
      const mentionMarker = `@{${user.id}}`;
      formattedContent = formattedContent.replace(
        new RegExp(mentionMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `@${displayName}`
      );
    });

    // También soportar formato legacy: @displayName|userId y @userId
    // Reemplazar formato legacy @displayName|userId con solo el nombre actual
    const legacyRegex = /@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/g;
    formattedContent = formattedContent.replace(legacyRegex, (match, displayName, userId) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        const currentDisplayName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : (user.username || 'Usuario');
        return `@${currentDisplayName}`;
      }
      return match; // Si no se encuentra el usuario, mantener el formato original
    });

    return formattedContent;
  }

  private async extractMentions(content: string): Promise<string[]> {
    // Regex para encontrar menciones en formato: @{userId}
    // También soporta formato legacy: @displayName|userId y @userId para compatibilidad
    const mentionRegex = /@\{([a-zA-Z0-9_-]+)\}|@([^|@]+?)\|([a-zA-Z0-9_-]{20,})|@([a-zA-Z0-9_-]{20,})/g;
    const matches = content.matchAll(mentionRegex);
    const mentionedUserIds: string[] = [];

    for (const match of matches) {
      // match[1] es userId del formato nuevo @{userId}
      // match[3] es userId del formato @nombre|userId
      // match[4] es userId del formato legacy @userId
      const userId = match[1] || match[3] || match[4];
      if (userId && !mentionedUserIds.includes(userId)) {
        mentionedUserIds.push(userId);
      }
    }

    if (mentionedUserIds.length === 0) {
      return [];
    }

    // Verificar que los IDs existen en la BD
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: mentionedUserIds },
      },
      select: { id: true },
    });

    return validUsers.map(u => u.id);
  }

  /**
   * Crear comentario en un poster
   */
  async createComment(posterId: string, userId: string, content: string, parentId?: string): Promise<PosterComment> {
    // Verificar que el poster existe
    const poster = await prisma.poster.findUnique({
      where: { id: posterId },
    });

    if (!poster) {
      throw new NotFoundError('Poster no encontrado');
    }

    // Extraer menciones del contenido
    const mentionedUserIds = await this.extractMentions(content);

    // Verificar si algún usuario mencionado está bloqueado (bidireccional)
    if (mentionedUserIds.length > 0) {
      const blockedMentions: string[] = [];
      
      for (const mentionedUserId of mentionedUserIds) {
        const isBlocked = await prisma.friend.findFirst({
          where: {
            status: 'blocked',
            OR: [
              { userId, friendId: mentionedUserId },
              { userId: mentionedUserId, friendId: userId },
            ],
          },
        });

        if (isBlocked) {
          blockedMentions.push(mentionedUserId);
        }
      }

      // Si hay menciones bloqueadas, lanzar error
      if (blockedMentions.length > 0) {
        throw new ForbiddenError('No puedes mencionar a usuarios bloqueados');
      }
    }

    // Crear comentario con menciones (solo si hay menciones)
    const commentData: any = {
      posterId,
      customerId: userId,
      content,
      parentId: parentId || null,
      likesCount: 0,
      isActive: true,
    };
    
    // Solo agregar mentions si hay menciones
    if (mentionedUserIds.length > 0) {
      commentData.mentions = mentionedUserIds;
    }
    
    const comment = await prisma.posterComment.create({
      data: commentData,
    });

    // Incrementar contador de comentarios
    const updatedPoster = await prisma.poster.update({
      where: { id: posterId },
      data: {
        commentsCount: {
          increment: 1,
        },
      },
    });

    // Actualizar métricas del feed (con debouncing)
    const feedService = new FeedService();
    feedService.updateItemMetricsDebounced(posterId, 'poster', {
      commentsCount: updatedPoster.commentsCount,
    });

    // Crear notificaciones
    try {
      const notificationsService = new NotificationsService();
      const commenter = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });

      const commenterDisplayName = commenter?.firstName && commenter?.lastName
        ? `${commenter.firstName} ${commenter.lastName}`
        : commenter?.email?.split('@')[0] || 'Alguien';

      const commentPreview = content.substring(0, 50) + (content.length > 50 ? '...' : '');

      // Notificación al dueño del post (si no es quien comentó)
      if (poster.customerId !== userId) {
        await notificationsService.createNotification({
          userId: poster.customerId,
          type: 'post_comment',
          title: 'Nuevo comentario en tu publicación',
          message: `${commenterDisplayName} comentó en tu publicación: "${commentPreview}"`,
          data: {
            posterId,
            commentId: comment.id,
            fromUserId: userId,
            type: 'post_comment',
          },
        });
      }

      // Notificaciones a usuarios mencionados (excluyendo al dueño del post y al comentador)
      const mentionedUserIdsToNotify = mentionedUserIds.filter(
        mentionedId => mentionedId !== poster.customerId && mentionedId !== userId
      );

      if (mentionedUserIdsToNotify.length > 0) {
        const mentionedUsers = await prisma.user.findMany({
          where: { id: { in: mentionedUserIdsToNotify } },
          select: { id: true, firstName: true, lastName: true, email: true },
        });

        for (const mentionedUser of mentionedUsers) {
          await notificationsService.createNotification({
            userId: mentionedUser.id,
            type: 'comment_mention',
            title: 'Te mencionaron en un comentario',
            message: `${commenterDisplayName} te mencionó en un comentario: "${commentPreview}"`,
            data: {
              posterId,
              commentId: comment.id,
              fromUserId: userId,
              type: 'comment_mention',
            },
          });
        }
      }
    } catch (notifError: any) {
      // No fallar si la notificación no se puede crear
      console.error(`Error creando notificaciones de comentario:`, notifError?.message);
    }

    return comment;
  }

  /**
   * Dar like/unlike a un comentario
   * TODO: Implementar sistema completo de reacciones con modelo separado para rastrear qué usuarios dieron like
   * Por ahora, simplemente incrementa/decrementa el contador
   */
  async toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean }> {
    const comment = await prisma.posterComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundError('Comentario no encontrado');
    }

    // TODO: En el futuro, crear un modelo PosterCommentReaction para rastrear likes individuales
    // Por ahora, siempre incrementamos el contador (se puede mejorar después)
    await prisma.posterComment.update({
      where: { id: commentId },
      data: {
        likesCount: {
          increment: 1,
        },
      },
    });

    return { liked: true };
  }

  /**
   * Eliminar un poster (soft delete)
   */
  async deletePoster(posterId: string, userId: string): Promise<void> {
    const poster = await prisma.poster.findUnique({
      where: { id: posterId },
    });

    if (!poster) {
      throw new NotFoundError('Poster no encontrado');
    }

    // Verificar que el usuario es el dueño del poster
    if (poster.customerId !== userId) {
      throw new BadRequestError('No tienes permiso para eliminar este poster');
    }

    // Soft delete: marcar como inactivo
    await prisma.poster.update({
      where: { id: posterId },
      data: {
        isActive: false,
      },
    });
  }
}


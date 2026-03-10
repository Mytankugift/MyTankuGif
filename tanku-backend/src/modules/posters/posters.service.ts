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
    limit: number = 20,
    userId?: string // ID del usuario que está viendo los comentarios (para mostrar ocultos si es el dueño)
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

    // Verificar si el usuario es el dueño del post
    let isPostOwner = false;
    if (userId) {
      const poster = await prisma.poster.findUnique({
        where: { id: posterId },
        select: { customerId: true },
      });
      isPostOwner = poster?.customerId === userId;
    }

    // Construir el where clause: si es el dueño, incluir comentarios ocultos
    const whereClause: any = {
      posterId,
      isActive: true,
      deletedAt: null, // No mostrar comentarios eliminados
      parentId: null, // Solo comentarios principales
    };

    // Si NO es el dueño del post, filtrar comentarios ocultos
    if (!isPostOwner) {
      whereClause.hiddenByOwner = false;
    }
    // Si es el dueño, no filtrar por hiddenByOwner (mostrar todos, ocultos y visibles)

    const [comments, total] = await Promise.all([
      prisma.posterComment.findMany({
        where: whereClause,
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
            where: {
              isActive: true,
              deletedAt: null, // No mostrar respuestas eliminadas
              ...(isPostOwner ? {} : { hiddenByOwner: false }), // Si es el dueño, mostrar todas las respuestas (incluyendo ocultas)
            },
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
        where: whereClause,
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
              hiddenByOwner: reply.hiddenByOwner || false, // Incluir el estado de oculto
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
          hiddenByOwner: comment.hiddenByOwner || false, // Incluir el estado de oculto
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

    // Reemplazar cada marcador @{userId} con el username del usuario (prioridad sobre nombre completo)
    users.forEach(user => {
      // Usar username en lugar de nombre completo (más fácil de trabajar, sin espacios)
      const displayName = user.username || 
        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Usuario');
      
      // Reemplazar todos los marcadores de este usuario
      const mentionMarker = `@{${user.id}}`;
      formattedContent = formattedContent.replace(
        new RegExp(mentionMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `@${displayName}`
      );
    });

    // También soportar formato legacy: @displayName|userId y @userId
    // Reemplazar formato legacy @displayName|userId con el username actual
    const legacyRegex = /@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/g;
    formattedContent = formattedContent.replace(legacyRegex, (match, displayName, userId) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        // Usar username en lugar de nombre completo
        const currentDisplayName = user.username || 
          (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Usuario');
        return `@${currentDisplayName}`;
      }
      return match; // Si no se encuentra el usuario, mantener el formato original
    });

    return formattedContent;
  }

  private async extractMentions(content: string): Promise<string[]> {
    console.log('\n🔍 ===== EXTRAER MENCIONES =====');
    console.log('📄 Contenido:', JSON.stringify(content));
    console.log('📏 Longitud:', content.length, 'caracteres');
    
    if (!content || !content.trim()) {
      console.log('⚠️  Contenido vacío, no hay menciones');
      console.log('====================================\n');
      return [];
    }

    const mentionedUserIds: string[] = [];
    
    // Patrón 1: Formato nuevo @{userId} - Prioridad alta
    // Busca @{ seguido de alfanuméricos/guiones/guiones bajos, luego }
    const newFormatRegex = /@\{([a-zA-Z0-9_-]+)\}/g;
    let match;
    
    console.log('\n1️⃣  PATRÓN 1: Buscando formato @{userId}');
    const pattern1Matches: string[] = [];
    while ((match = newFormatRegex.exec(content)) !== null) {
      const userId = match[1];
      console.log(`   ✓ Encontrado: ${match[0]} → userId: ${userId} (${userId.length} caracteres)`);
      // Los userIds de Prisma CUID tienen al menos 25 caracteres, pero aceptamos desde 20 para compatibilidad
      if (userId && userId.length >= 20 && !mentionedUserIds.includes(userId)) {
        mentionedUserIds.push(userId);
        pattern1Matches.push(userId);
      }
    }
    console.log(`   📊 Total encontrados: ${pattern1Matches.length}`, pattern1Matches.length > 0 ? `→ ${pattern1Matches.join(', ')}` : '');
    
    // Patrón 2: Formato legacy @displayName|userId
    // Busca @ seguido de caracteres que no sean @, |, espacios al inicio
    // Luego | seguido de un userId válido (mínimo 20 caracteres)
    const legacyFormatRegex = /@([^\s@|]+)\|([a-zA-Z0-9_-]{20,})/g;
    
    // Resetear el lastIndex del regex anterior
    legacyFormatRegex.lastIndex = 0;
    
    while ((match = legacyFormatRegex.exec(content)) !== null) {
      const userId = match[2];
      if (userId && !mentionedUserIds.includes(userId)) {
        mentionedUserIds.push(userId);
      }
    }
    
    // Patrón 3: Formato legacy directo @userId (solo si tiene al menos 20 caracteres)
    // Solo capturar si está al inicio de línea, después de espacio, o después de @
    // Esto evita capturar IDs que son parte de texto normal
    const directFormatRegex = /(?:^|\s|@)@([a-zA-Z0-9_-]{20,})(?=\s|$|[^\w-])/g;
    
    // Resetear el lastIndex
    directFormatRegex.lastIndex = 0;
    
    while ((match = directFormatRegex.exec(content)) !== null) {
      const userId = match[1];
      if (userId && !mentionedUserIds.includes(userId)) {
        mentionedUserIds.push(userId);
      }
    }

    // Patrón 4a: Detectar menciones por username (sin espacios) - Prioridad alta
    // Busca @ seguido de caracteres alfanuméricos, guiones y guiones bajos (username)
    // Acepta cualquier carácter de delimitación después del username
    const usernameMentionRegex = /@([a-zA-Z0-9_-]+)(?=\s|$|@|,|\.|!|\?|:)/g;
    usernameMentionRegex.lastIndex = 0;
    
    console.log('\n4️⃣  PATRÓN 4a: Buscando formato @username');
    const usernameMentions: string[] = [];
    while ((match = usernameMentionRegex.exec(content)) !== null) {
      const username = match[1].trim();
      const matchIndex = match.index;
      const beforeMatch = content.substring(Math.max(0, matchIndex - 1), matchIndex);
      const afterMatch = content.substring(matchIndex + match[0].length);
      
      console.log(`   🔎 Encontrado: ${match[0]}`);
      console.log(`      Username: "${username}"`);
      console.log(`      Posición: ${matchIndex}`);
      console.log(`      Antes: "${beforeMatch}" | Después: "${afterMatch.substring(0, 30)}"`);
      
      // Verificar que no está dentro de un formato conocido
      if (!beforeMatch.endsWith('{') && username.length > 0) {
        // Evitar duplicados
        if (!usernameMentions.includes(username)) {
          usernameMentions.push(username);
          console.log(`      ✅ Agregado a lista de usernames`);
        } else {
          console.log(`      ⚠️  Ya existe (duplicado)`);
        }
      } else {
        console.log(`      ❌ Rechazado (ya está en formato @{userId} o vacío)`);
      }
    }
    console.log(`   📊 Usernames encontrados: ${usernameMentions.length}`, usernameMentions.length > 0 ? `→ ${usernameMentions.join(', ')}` : '');
    
    // Buscar usuarios por username primero (más preciso y rápido)
    if (usernameMentions.length > 0) {
      console.log(`\n   🔍 Buscando en BD usuarios con usernames: ${usernameMentions.join(', ')}`);
      const users = await prisma.user.findMany({
        where: {
          username: { in: usernameMentions },
        },
        select: { id: true, username: true },
      });
      
      console.log(`   📋 Usuarios encontrados en BD: ${users.length}`);
      users.forEach(u => console.log(`      - ${u.username} (id: ${u.id})`));
      
      users.forEach(user => {
        if (!mentionedUserIds.includes(user.id)) {
          mentionedUserIds.push(user.id);
          console.log(`      ✅ Agregado userId: ${user.id} (${user.username})`);
        }
      });
    } else {
      console.log('   ℹ️  No hay usernames para buscar en BD');
    }
    
    // Patrón 4b: Detectar menciones por nombre completo (solo si no hay username matches)
    // Busca @ seguido de nombres con espacios (ej: @john perez)
    // Solo buscar si no se encontraron usernames para evitar duplicados
    if (usernameMentions.length === 0) {
      const nameMentionRegex = /@([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,20}[a-zA-ZáéíóúÁÉÍÓÚñÑ])(?=\s|$|@|,|\.|!|\?)/g;
      nameMentionRegex.lastIndex = 0;
      
      const nameMentions: string[] = [];
      while ((match = nameMentionRegex.exec(content)) !== null) {
        const name = match[1].trim();
        // Evitar capturar si ya es parte de un formato conocido
        const matchIndex = match.index;
        const beforeMatch = content.substring(Math.max(0, matchIndex - 1), matchIndex);
        const afterMatch = content.substring(matchIndex + match[0].length, matchIndex + match[0].length + 1);
        
        // No capturar si está dentro de @{userId} o @name|userId
        if (!beforeMatch.endsWith('{') && !afterMatch.startsWith('|') && name.length > 0) {
          // Evitar duplicados
          if (!nameMentions.includes(name)) {
            nameMentions.push(name);
          }
        }
      }
      
      // Si hay menciones por nombre, buscar usuarios que coincidan
      if (nameMentions.length > 0) {
        const userQueries = nameMentions.map(name => {
          const nameParts = name.trim().split(/\s+/).filter(part => part.length > 0);
          
          if (nameParts.length >= 2) {
            // Buscar por firstName y lastName
            return {
              AND: [
                { firstName: { contains: nameParts[0], mode: 'insensitive' as const } },
                { lastName: { contains: nameParts[nameParts.length - 1], mode: 'insensitive' as const } }
              ]
            };
          } else if (nameParts.length === 1) {
            // Buscar por firstName, lastName o username
            const searchTerm = nameParts[0];
            return {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' as const } },
                { lastName: { contains: searchTerm, mode: 'insensitive' as const } },
                { username: { contains: searchTerm, mode: 'insensitive' as const } }
              ]
            };
          }
          return null;
        }).filter(query => query !== null);

        if (userQueries.length > 0) {
          const users = await prisma.user.findMany({
            where: {
              OR: userQueries as any,
            },
            select: { id: true },
          });
          
          users.forEach(user => {
            if (!mentionedUserIds.includes(user.id)) {
              mentionedUserIds.push(user.id);
            }
          });
        }
      }
    }

    console.log(`\n📊 RESUMEN: ${mentionedUserIds.length} userId(s) detectado(s) antes de validación:`, mentionedUserIds);
    
    if (mentionedUserIds.length === 0) {
      console.log('⚠️  No se detectaron menciones');
      console.log('====================================\n');
      return [];
    }

    // Verificar que los IDs existen en la BD
    console.log(`\n✅ Validando ${mentionedUserIds.length} userId(s) en BD...`);
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: mentionedUserIds },
      },
      select: { id: true, username: true },
    });

    console.log(`📋 Usuarios válidos encontrados: ${validUsers.length}`);
    validUsers.forEach(u => console.log(`   - ${u.username || 'sin username'} (${u.id})`));
    
    const result = validUsers.map(u => u.id);
    console.log(`\n✅ RESULTADO FINAL: ${result.length} mención(es) válida(s) →`, result);
    console.log('====================================\n');
    
    return result;
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
    console.log('\n🔍 EXTRAYENDO MENCIONES DEL CONTENIDO...');
    console.log('📄 Contenido a procesar:', JSON.stringify(content));
    const mentionedUserIds = await this.extractMentions(content);
    console.log(`✅ Menciones extraídas: ${mentionedUserIds.length} userId(s) →`, mentionedUserIds);

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
      console.log(`\n✅ Agregando ${mentionedUserIds.length} mención(es) al comentario:`, mentionedUserIds);
    } else {
      console.log('\nℹ️  No hay menciones para agregar al comentario');
    }
    
    console.log('\n💾 Datos del comentario a crear:');
    console.log('   - PosterId:', commentData.posterId);
    console.log('   - CustomerId:', commentData.customerId);
    console.log('   - Contenido:', commentData.content.substring(0, 80) + (commentData.content.length > 80 ? '...' : ''));
    console.log('   - ParentId:', commentData.parentId || 'null (comentario principal)');
    console.log('   - Menciones:', commentData.mentions || 'ninguna');
    
    const comment = await prisma.posterComment.create({
      data: commentData,
    });
    
    console.log(`\n✅ Comentario creado exitosamente!`);
    console.log(`   📝 ID: ${comment.id}`);
    console.log(`   💬 Menciones guardadas:`, comment.mentions || 'ninguna');
    console.log('================================\n');

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

    // Formatear el contenido antes de devolverlo (reemplazar @{userId} con username)
    let mentionsArray: string[] | undefined = undefined;
    if (comment.mentions) {
      try {
        if (Array.isArray(comment.mentions)) {
          mentionsArray = comment.mentions as string[];
        } else if (typeof comment.mentions === 'string') {
          mentionsArray = JSON.parse(comment.mentions);
        }
      } catch (e) {
        console.error('Error parsing mentions al formatear:', e);
      }
    }

    const formattedContent = await this.formatCommentContent(
      comment.content,
      mentionsArray
    );

    console.log('\n🔄 Formateando contenido del comentario creado...');
    console.log('   📄 Antes:', comment.content);
    console.log('   ✨ Después:', formattedContent);
    console.log('   👥 Menciones usadas:', mentionsArray || 'ninguna');

    // Obtener el comentario completo con relaciones para devolverlo formateado
    const commentWithRelations = await prisma.posterComment.findUnique({
      where: { id: comment.id },
      include: {
        customer: {
          include: { profile: true },
        },
      },
    });

    if (!commentWithRelations) {
      throw new NotFoundError('Comentario no encontrado después de crearlo');
    }

    // Crear el DTO con el contenido formateado
    const commentDTO = this.mapCommentToDTO(commentWithRelations);
    commentDTO.content = formattedContent; // Reemplazar con contenido formateado

    console.log('✅ Comentario formateado y listo para devolver\n');

    return commentDTO;
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

    // Eliminar archivos de S3 antes del soft delete
    const filesToDelete: string[] = [];
    
    if (poster.imageUrl) {
      filesToDelete.push(poster.imageUrl);
    }
    
    if (poster.videoUrl) {
      filesToDelete.push(poster.videoUrl);
    }

    // Eliminar archivos de S3
    if (filesToDelete.length > 0) {
      try {
        await Promise.all(
          filesToDelete.map(async (fileUrl) => {
            try {
              await this.s3Service.deleteFile(fileUrl);
              console.log(`[POSTERS] Archivo ${fileUrl} eliminado de S3`);
            } catch (error) {
              console.error(`[POSTERS] Error eliminando archivo ${fileUrl} de S3:`, error);
              // No lanzar error para que el soft delete continúe incluso si falla la eliminación de S3
            }
          })
        );
      } catch (error) {
        console.error(`[POSTERS] Error eliminando archivos de S3:`, error);
        // Continuar con el soft delete incluso si falla la eliminación de S3
      }
    }

    // Soft delete: marcar como inactivo
    await prisma.poster.update({
      where: { id: posterId },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Actualizar comentario (soft delete, ocultar, o edición)
   * @param commentId ID del comentario
   * @param userId ID del usuario que realiza la acción
   * @param data Datos a actualizar
   * @param isPosterOwner Si el usuario es el dueño del poster (puede ocultar comentarios)
   * @param isAdmin Si el usuario es admin
   */
  async updateComment(
    commentId: string,
    userId: string,
    data: { isActive?: boolean; hiddenByOwner?: boolean; content?: string },
    isPosterOwner: boolean = false,
    isAdmin: boolean = false
  ): Promise<any> {
    const comment = await prisma.posterComment.findUnique({
      where: { id: commentId },
      include: {
        customer: {
          include: { profile: true },
        },
        poster: {
          select: { 
            id: true,
            customerId: true,
            commentsCount: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundError('Comentario no encontrado');
    }

    // Verificar permisos según la acción
    const isCommentOwner = comment.customerId === userId;
    const isOwnerOfPoster = comment.poster.customerId === userId;

    // Soft delete: solo el dueño del comentario puede eliminarlo
    if (data.isActive === false) {
      if (!isCommentOwner && !isAdmin) {
        throw new ForbiddenError('Solo puedes eliminar tus propios comentarios');
      }
    }

    // Ocultar comentario: solo el dueño del poster puede ocultar comentarios
    if (data.hiddenByOwner !== undefined) {
      if (!isOwnerOfPoster && !isAdmin) {
        throw new ForbiddenError('Solo el dueño de la publicación puede ocultar comentarios');
      }
    }

    // Editar contenido: solo el dueño del comentario puede editarlo
    if (data.content !== undefined) {
      if (!isCommentOwner && !isAdmin) {
        throw new ForbiddenError('Solo puedes editar tus propios comentarios');
      }
    }

    const updateData: any = {};

    // Soft delete
    if (data.isActive === false) {
      // Solo decrementar si el comentario NO estaba ya eliminado
      const wasAlreadyDeleted = !comment.isActive || comment.deletedAt !== null;
      
      if (!wasAlreadyDeleted) {
        updateData.isActive = false;
        updateData.deletedAt = new Date();
        
        // Contar cuántos comentarios se van a eliminar (incluyendo respuestas)
        const repliesCount = await prisma.posterComment.count({
          where: {
            parentId: commentId,
            isActive: true,
            deletedAt: null,
          },
        });
        
        // Decrementar contador de comentarios del poster
        // 1 comentario principal + todas sus respuestas activas
        const totalToDecrement = 1 + repliesCount;
        
        console.log(`\n🗑️  Eliminando comentario y ${repliesCount} respuesta(s)`);
        console.log(`   📉 Decrementando contador de comentarios en ${totalToDecrement}`);
        
        await prisma.poster.update({
          where: { id: comment.posterId },
          data: {
            commentsCount: {
              decrement: totalToDecrement,
            },
          },
        });
        
        // También marcar las respuestas como eliminadas
        if (repliesCount > 0) {
          await prisma.posterComment.updateMany({
            where: {
              parentId: commentId,
              isActive: true,
              deletedAt: null,
            },
            data: {
              isActive: false,
              deletedAt: new Date(),
            },
          });
          console.log(`   ✅ ${repliesCount} respuesta(s) también marcadas como eliminadas`);
        }
        
        // Actualizar métricas del feed
        const feedService = new FeedService();
        const updatedPoster = await prisma.poster.findUnique({
          where: { id: comment.posterId },
          select: { commentsCount: true },
        });
        
        if (updatedPoster) {
          feedService.updateItemMetricsDebounced(comment.posterId, 'poster', {
            commentsCount: updatedPoster.commentsCount,
          });
        }
      } else {
        // Ya estaba eliminado, solo actualizar los campos sin decrementar
        updateData.isActive = false;
        updateData.deletedAt = comment.deletedAt || new Date();
        console.log(`\n⚠️  Comentario ya estaba eliminado, no se decrementa el contador`);
      }
      
    } else if (data.isActive === true) {
      // Restaurar comentario (solo admin)
      if (!isAdmin) {
        throw new ForbiddenError('Solo un administrador puede restaurar comentarios');
      }
      
      // Solo incrementar si el comentario estaba eliminado
      const wasDeleted = !comment.isActive || comment.deletedAt !== null;
      
      if (wasDeleted) {
        updateData.isActive = true;
        updateData.deletedAt = null;
        
        // Contar cuántos comentarios se van a restaurar (incluyendo respuestas)
        const repliesCount = await prisma.posterComment.count({
          where: {
            parentId: commentId,
            isActive: false,
          },
        });
        
        // Incrementar contador de comentarios del poster
        const totalToIncrement = 1 + repliesCount;
        
        console.log(`\n♻️  Restaurando comentario y ${repliesCount} respuesta(s)`);
        console.log(`   📈 Incrementando contador de comentarios en ${totalToIncrement}`);
        
        await prisma.poster.update({
          where: { id: comment.posterId },
          data: {
            commentsCount: {
              increment: totalToIncrement,
            },
          },
        });
        
        // También restaurar las respuestas
        if (repliesCount > 0) {
          await prisma.posterComment.updateMany({
            where: {
              parentId: commentId,
              isActive: false,
            },
            data: {
              isActive: true,
              deletedAt: null,
            },
          });
          console.log(`   ✅ ${repliesCount} respuesta(s) también restauradas`);
        }
        
        // Actualizar métricas del feed
        const feedService = new FeedService();
        const updatedPoster = await prisma.poster.findUnique({
          where: { id: comment.posterId },
          select: { commentsCount: true },
        });
        
        if (updatedPoster) {
          feedService.updateItemMetricsDebounced(comment.posterId, 'poster', {
            commentsCount: updatedPoster.commentsCount,
          });
        }
      } else {
        // Ya estaba activo, solo actualizar los campos sin incrementar
        updateData.isActive = true;
        updateData.deletedAt = null;
        console.log(`\n⚠️  Comentario ya estaba activo, no se incrementa el contador`);
      }
    }

    // Ocultar/mostrar comentario
    if (data.hiddenByOwner !== undefined) {
      updateData.hiddenByOwner = data.hiddenByOwner;
      
      // Si se oculta el comentario, también ocultar todos sus hijos (respuestas)
      if (data.hiddenByOwner === true) {
        const repliesCount = await prisma.posterComment.count({
          where: {
            parentId: commentId,
            hiddenByOwner: false,
          },
        });
        
        if (repliesCount > 0) {
          await prisma.posterComment.updateMany({
            where: {
              parentId: commentId,
              hiddenByOwner: false,
            },
            data: {
              hiddenByOwner: true,
            },
          });
          console.log(`\n🔒 Ocultando ${repliesCount} respuesta(s) junto con el comentario principal`);
        }
      } else if (data.hiddenByOwner === false) {
        // Si se muestra el comentario, también mostrar todos sus hijos (respuestas)
        const repliesCount = await prisma.posterComment.count({
          where: {
            parentId: commentId,
            hiddenByOwner: true,
          },
        });
        
        if (repliesCount > 0) {
          await prisma.posterComment.updateMany({
            where: {
              parentId: commentId,
              hiddenByOwner: true,
            },
            data: {
              hiddenByOwner: false,
            },
          });
          console.log(`\n🔓 Mostrando ${repliesCount} respuesta(s) junto con el comentario principal`);
        }
      }
    }

    // Actualizar contenido
    if (data.content !== undefined) {
      // Si se actualiza el contenido, re-extraer menciones
      const mentionedUserIds = await this.extractMentions(data.content);
      updateData.content = data.content;

      if (mentionedUserIds.length > 0) {
        updateData.mentions = mentionedUserIds;
      } else {
        updateData.mentions = null;
      }
    }

    updateData.updatedAt = new Date();

    const updatedComment = await prisma.posterComment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        customer: {
          include: { profile: true },
        },
      },
    });

    return this.mapCommentToDTO(updatedComment);
  }
}


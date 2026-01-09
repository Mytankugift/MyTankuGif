import { prisma } from '../../config/database';
import { S3Service } from '../../shared/services/s3.service';
import { PosterDTO, PosterAuthorDTO } from '../../shared/dto/posters.dto';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import { FeedService } from '../feed/feed.service';
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
      avatar: user.profile?.avatar || null,
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
    }
  ): PosterDTO {
    return {
      id: poster.id,
      imageUrl: poster.imageUrl,
      videoUrl: poster.videoUrl,
      description: poster.description,
      likesCount: poster.likesCount,
      commentsCount: poster.commentsCount,
      createdAt: poster.createdAt.toISOString(),
      author: this.mapUserToPosterAuthorDTO(poster.customer),
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

      return posters.map((poster) => this.mapPosterToDTO(poster));
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

      return posters.map((poster) => this.mapPosterToDTO(poster));
    } catch (error: any) {
      console.error(`❌ [POSTERS SERVICE] Error obteniendo posters:`, error.message);
      return [];
    }
  }

  /**
   * Obtener un poster específico por ID
   */
  async getPosterById(posterId: string): Promise<PosterDTO> {
    const poster = await prisma.poster.findUnique({
      where: { id: posterId },
      include: {
        customer: {
          include: {
            profile: true,
          },
        },
        reactions: true,
        comments: {
          where: { isActive: true },
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

    if (!poster) {
      throw new NotFoundError('Poster no encontrado');
    }

    return this.mapPosterToDTO(poster);
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

      return { liked: true };
    }
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

    // Crear comentario
    const comment = await prisma.posterComment.create({
      data: {
        posterId,
        customerId: userId,
        content,
        parentId: parentId || null,
        likesCount: 0,
        isActive: true,
      },
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

    return comment;
  }
}


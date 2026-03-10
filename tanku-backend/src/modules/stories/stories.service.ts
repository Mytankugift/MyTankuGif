import { prisma } from '../../config/database';
import { S3Service } from '../../shared/services/s3.service';
import { StoryDTO, StoryFileDTO } from '../../shared/dto/stories.dto';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import type { StoriesUser, StoryFile, User, UserProfile } from '@prisma/client';

export class StoriesService {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  // ==================== MAPPERS ====================

  /**
   * Mapper: User + UserProfile a AuthorDTO
   */
  private mapUserToAuthorDTO(user: User & { profile: UserProfile | null }): {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    username: string | null;
  } {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.profile?.avatar || null,
      username: user.username || null,
    };
  }

  /**
   * Mapper: StoryFile de Prisma a StoryFileDTO
   */
  private mapStoryFileToDTO(file: StoryFile): StoryFileDTO {
    return {
      id: file.id,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSize: file.fileSize,
      duration: file.duration,
      orderIndex: file.orderIndex,
    };
  }

  /**
   * Mapper: StoriesUser de Prisma a StoryDTO
   */
  private mapStoryToDTO(
    story: StoriesUser & {
      customer: User & { profile: UserProfile | null };
      storyFiles: StoryFile[];
      product?: { handle: string } | null;
    }
  ): StoryDTO {
    return {
      id: story.id,
      userId: story.customerId,
      title: story.title,
      description: story.description,
      duration: story.duration,
      viewsCount: story.viewsCount,
      expiresAt: story.expiresAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
      files: story.storyFiles.map((file) => this.mapStoryFileToDTO(file)),
      author: this.mapUserToAuthorDTO(story.customer),
      storyType: story.storyType || 'NORMAL',
      wishlistId: story.wishlistId || null,
      productId: story.productId || null,
      variantId: story.variantId || null,
      productHandle: story.product?.handle || null,
    };
  }

  // ==================== MÉTODOS NORMALIZADOS ====================

  /**
   * Crear una nueva story
   */
  async createStory(data: {
    userId: string;
    title?: string;
    description?: string;
    storyType?: 'NORMAL' | 'WISHLIST';
    wishlistId?: string;
    productId?: string;
    variantId?: string;
    files: Array<{
      file_url: string;
      file_type: string;
      file_size?: number;
      order_index: number;
    }>;
  }): Promise<StoryDTO> {
    if (!data.files || data.files.length === 0) {
      throw new BadRequestError('Se requiere al menos un archivo para la story');
    }

    // Calcular fecha de expiración (24 horas por defecto)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Crear la story
    const story = await prisma.storiesUser.create({
      data: {
        customerId: data.userId,
        title: data.title || 'Mi Story',
        description: data.description || null,
        duration: 24,
        viewsCount: 0,
        isActive: true,
        expiresAt,
        storyType: data.storyType || 'NORMAL',
        wishlistId: data.wishlistId || null,
        productId: data.productId || null,
        variantId: data.variantId || null,
        storyFiles: {
          create: data.files.map((file) => ({
            fileUrl: file.file_url,
            fileType: file.file_type,
            fileSize: file.file_size || null,
            orderIndex: file.order_index,
          })),
        },
      },
      include: {
        customer: {
          include: {
            profile: true,
          },
        },
        storyFiles: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return this.mapStoryToDTO(story);
  }

  /**
   * Validar límite de 3 historias de wishlist por 24 horas
   */
  async checkWishlistStoryLimit(userId: string): Promise<boolean> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const count = await prisma.storiesUser.count({
        where: {
          customerId: userId,
          storyType: 'WISHLIST',
          createdAt: {
            gte: twentyFourHoursAgo,
          },
        },
      });

      return count < 3;
    } catch (error: any) {
      console.error(`❌ [STORIES SERVICE] Error validando límite:`, error.message);
      return false;
    }
  }

  /**
   * Crear historia automática de wishlist
   */
  async createWishlistStory(data: {
    userId: string;
    wishlistId: string;
    productId: string;
    variantId?: string;
  }): Promise<StoryDTO | null> {
    try {
      // Validar límite de 3 historias por 24 horas
      const canCreate = await this.checkWishlistStoryLimit(data.userId);
      if (!canCreate) {
        console.log(`⚠️ [STORIES SERVICE] Límite de 3 historias de wishlist alcanzado para usuario ${data.userId}`);
        return null;
      }

      // Obtener información del producto con handle
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: {
          id: true,
          title: true,
          handle: true,
          images: true,
          variants: {
            where: data.variantId ? { id: data.variantId } : { active: true },
            orderBy: { price: 'asc' },
            take: 1,
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundError('Producto no encontrado');
      }

      const variant = product.variants[0];
      if (!variant) {
        throw new NotFoundError('Variante no encontrada');
      }

      // Usar la primera imagen del producto
      const productImage = product.images && product.images.length > 0 ? product.images[0] : null;
      if (!productImage) {
        throw new BadRequestError('El producto no tiene imagen');
      }

      // Calcular fecha de expiración (24 horas)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Crear la historia
      const story = await prisma.storiesUser.create({
        data: {
          customerId: data.userId,
          title: `Nuevo producto en wishlist`,
          description: `${product.title} agregado a tu wishlist`,
          duration: 24,
          viewsCount: 0,
          isActive: true,
          expiresAt,
          storyType: 'WISHLIST',
          wishlistId: data.wishlistId,
          productId: data.productId,
          variantId: variant.id,
          storyFiles: {
            create: {
              fileUrl: productImage,
              fileType: 'image',
              orderIndex: 0,
            },
          },
        },
        include: {
          customer: {
            include: {
              profile: true,
            },
          },
          storyFiles: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      return this.mapStoryToDTO(story);
    } catch (error: any) {
      console.error(`❌ [STORIES SERVICE] Error creando historia de wishlist:`, error.message);
      throw error;
    }
  }

  /**
   * Obtener solo historias de wishlist
   */
  async getWishlistStories(userId?: string): Promise<StoryDTO[]> {
    try {
      const where: any = {
        storyType: 'WISHLIST',
        isActive: true,
        expiresAt: {
          gt: new Date(), // Solo stories que no han expirado
        },
      };

      if (userId) {
        where.customerId = userId;
      }

      const stories = await prisma.storiesUser.findMany({
        where,
        include: {
          customer: {
            include: {
              profile: true,
            },
          },
          storyFiles: {
            orderBy: { orderIndex: 'asc' },
          },
          product: {
            select: {
              handle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return stories.map((story) => this.mapStoryToDTO(story));
    } catch (error: any) {
      console.error(`❌ [STORIES SERVICE] Error obteniendo historias de wishlist:`, error.message);
      return [];
    }
  }

  /**
   * Obtener feed de historias (amigos + propias) - OPTIMIZADO
   */
  async getFeedStories(userId: string, limit: number = 50): Promise<StoryDTO[]> {
    try {
      // OPTIMIZACIÓN 1: Usar una consulta más eficiente con UNION en lugar de OR
      // OPTIMIZACIÓN 2: Agregar límite para evitar cargar demasiadas stories
      // OPTIMIZACIÓN 3: Filtrar por expiresAt directamente en la consulta
      
      const now = new Date();
      
      // Obtener IDs de amigos de forma más eficiente usando consultas separadas
      // Esto aprovecha mejor los índices compuestos [userId, status] y [friendId, status]
      const [friendsAsUser, friendsAsFriend] = await Promise.all([
        prisma.friend.findMany({
          where: {
            userId,
            status: 'accepted',
          },
          select: {
            friendId: true,
          },
        }),
        prisma.friend.findMany({
          where: {
            friendId: userId,
            status: 'accepted',
          },
          select: {
            userId: true,
          },
        }),
      ]);

      const friendIds = new Set<string>([userId]); // Incluir historias propias
      friendsAsUser.forEach((f) => friendIds.add(f.friendId));
      friendsAsFriend.forEach((f) => friendIds.add(f.userId));

      // Si no hay amigos, solo obtener stories propias
      if (friendIds.size === 1) {
        const stories = await prisma.storiesUser.findMany({
          where: {
            customerId: userId,
            isActive: true,
            expiresAt: {
              gt: now,
            },
          },
          include: {
            customer: {
              include: {
                profile: true,
              },
            },
            storyFiles: {
              orderBy: { orderIndex: 'asc' },
            },
            product: {
              select: {
                handle: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit, // ✅ Agregar límite
        });

        return stories.map((story) => this.mapStoryToDTO(story));
      }

      // OPTIMIZACIÓN 4: Agregar límite y usar índices existentes
      const stories = await prisma.storiesUser.findMany({
        where: {
          customerId: {
            in: Array.from(friendIds),
          },
          isActive: true,
          expiresAt: {
            gt: now, // ✅ Usar variable en lugar de new Date() cada vez
          },
        },
        include: {
          customer: {
            include: {
              profile: true,
            },
          },
          storyFiles: {
            orderBy: { orderIndex: 'asc' },
          },
          product: {
            select: {
              handle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit, // ✅ Agregar límite para evitar cargar demasiadas stories
      });

      return stories.map((story) => this.mapStoryToDTO(story));
    } catch (error: any) {
      console.error(`❌ [STORIES SERVICE] Error obteniendo feed de historias:`, error.message);
      return [];
    }
  }

  /**
   * Obtener stories del usuario con filtro opcional por tipo
   */
  async getStoriesByUserId(userId: string, storyType?: 'NORMAL' | 'WISHLIST'): Promise<StoryDTO[]> {
    try {
      // Verificar que las tablas existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM stories_user LIMIT 1`.catch(() => {
          throw new Error('Tabla stories_user no existe');
        });
      } catch (tableError: any) {
        return [];
      }

      const where: any = {
        customerId: userId,
        isActive: true,
        expiresAt: {
          gt: new Date(), // Solo stories que no han expirado
        },
      };

      if (storyType) {
        where.storyType = storyType;
      }

      const stories = await prisma.storiesUser.findMany({
        where,
        include: {
          customer: {
            include: {
              profile: true,
            },
          },
          storyFiles: {
            orderBy: { orderIndex: 'asc' },
          },
          product: {
            select: {
              handle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return stories.map((story) => this.mapStoryToDTO(story));
    } catch (error: any) {
      console.error(`❌ [STORIES SERVICE] Error obteniendo stories:`, error.message);
      return [];
    }
  }
}


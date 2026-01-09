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
  } {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.profile?.avatar || null,
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
    };
  }

  // ==================== MÉTODOS NORMALIZADOS ====================

  /**
   * Obtener stories del usuario
   */
  async getStoriesByUserId(userId: string): Promise<StoryDTO[]> {
    try {
      // Verificar que las tablas existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM stories_user LIMIT 1`.catch(() => {
          throw new Error('Tabla stories_user no existe');
        });
      } catch (tableError: any) {
        return [];
      }

      const stories = await prisma.storiesUser.findMany({
        where: {
          customerId: userId,
          isActive: true,
          expiresAt: {
            gt: new Date(), // Solo stories que no han expirado
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
        orderBy: { createdAt: 'desc' },
      });

      return stories.map((story) => this.mapStoryToDTO(story));
    } catch (error: any) {
      console.error(`❌ [STORIES SERVICE] Error obteniendo stories:`, error.message);
      return [];
    }
  }

  /**
   * Crear una nueva story
   */
  async createStory(data: {
    userId: string;
    title?: string;
    description?: string;
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
}


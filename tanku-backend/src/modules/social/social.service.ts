import { prisma } from '../../config/database';
import { S3Service } from '../../shared/services/s3.service';

export class SocialService {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  /**
   * Obtener feed de posters (posts del usuario y sus amigos)
   * Ahora usa Prisma en lugar de MongoDB
   */
  async getFeedPoster(customerId: string): Promise<any[]> {
    try {
      console.log(`📱 [SOCIAL SERVICE] Obteniendo feed para usuario: ${customerId}`);
      
      // Verificar que las tablas sociales existen (si no, devolver array vacío)
      // Esto evita errores si las migraciones no se han ejecutado
      try {
        // Verificar que el modelo existe haciendo una query simple
        await prisma.$queryRaw`SELECT 1 FROM posters LIMIT 1`.catch(() => {
          throw new Error('Tabla posters no existe');
        });
      } catch (tableError: any) {
        console.warn(`⚠️ [SOCIAL SERVICE] Tablas sociales no creadas aún. Ejecuta: npx prisma migrate dev`);
        return [];
      }
      
      // Verificar cuántos posters tiene el usuario (con y sin filtro isActive)
      const totalPosters = await prisma.poster.count({
        where: { customerId },
      });
      const activePosters = await prisma.poster.count({
        where: { customerId, isActive: true },
      });
      const inactivePosters = await prisma.poster.count({
        where: { customerId, isActive: false },
      });
      
      console.log(`📱 [SOCIAL SERVICE] Total posters del usuario: ${totalPosters}`);
      console.log(`📱 [SOCIAL SERVICE] Posters activos: ${activePosters}`);
      console.log(`📱 [SOCIAL SERVICE] Posters inactivos: ${inactivePosters}`);
      
      // Si hay posters inactivos, mostrar algunos ejemplos
      if (inactivePosters > 0) {
        const inactiveExamples = await prisma.poster.findMany({
          where: { customerId, isActive: false },
          take: 3,
          select: {
            id: true,
            title: true,
            isActive: true,
            createdAt: true,
          },
        });
        console.log(`⚠️ [SOCIAL SERVICE] Ejemplos de posters inactivos:`, inactiveExamples);
      }
      
      // Obtener posts del usuario desde Prisma
      const posters = await prisma.poster.findMany({
        where: {
          customerId,
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
            take: 5, // Solo primeros 5 comentarios
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      console.log(`✅ [SOCIAL SERVICE] Encontrados ${posters.length} posters`);

      return posters.map((poster) => {
        const customerName = poster.customer
          ? `${poster.customer.firstName || ''} ${poster.customer.lastName || ''}`.trim() || 'Usuario'
          : 'Usuario';
        
        return {
          id: poster.id,
          customer_id: poster.customerId,
          customer_name: customerName,
          customer_email: poster.customer?.email || '',
          avatar_url: poster.customer?.profile?.avatar || null,
          title: poster.title || '',
          description: poster.description || '',
          image_url: poster.imageUrl || null,
          video_url: poster.videoUrl || null,
          likes_count: poster.likesCount,
          comments_count: poster.commentsCount,
          is_active: poster.isActive,
          created_at: poster.createdAt.toISOString(),
          updated_at: poster.updatedAt.toISOString(),
          deleted_at: null,
          customer: poster.customer ? {
            id: poster.customer.id,
            email: poster.customer.email,
            firstName: poster.customer.firstName,
            lastName: poster.customer.lastName,
            avatar: poster.customer.profile?.avatar,
          } : null,
        };
      });
    } catch (error: any) {
      console.error(`❌ [SOCIAL SERVICE] Error obteniendo feed:`, error.message);
      return [];
    }
  }

  /**
   * Obtener posters de un usuario específico (para el perfil)
   */
  async getPosters(customerId: string): Promise<any[]> {
    try {
      console.log(`📱 [SOCIAL SERVICE] Obteniendo posters para usuario: ${customerId}`);
      
      // Verificar que las tablas sociales existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM posters LIMIT 1`.catch(() => {
          throw new Error('Tabla posters no existe');
        });
      } catch (tableError: any) {
        console.warn(`⚠️ [SOCIAL SERVICE] Tablas sociales no creadas aún. Ejecuta: npx prisma migrate dev`);
        return [];
      }
      
      // Verificar cuántos posters tiene el usuario (con y sin filtro isActive)
      const totalPosters = await prisma.poster.count({
        where: { customerId },
      });
      const activePosters = await prisma.poster.count({
        where: { customerId, isActive: true },
      });
      const inactivePosters = await prisma.poster.count({
        where: { customerId, isActive: false },
      });
      
      console.log(`📱 [SOCIAL SERVICE] Total posters del usuario: ${totalPosters}`);
      console.log(`📱 [SOCIAL SERVICE] Posters activos: ${activePosters}`);
      console.log(`📱 [SOCIAL SERVICE] Posters inactivos: ${inactivePosters}`);
      
      // Si hay posters inactivos, mostrar algunos ejemplos
      if (inactivePosters > 0) {
        const inactiveExamples = await prisma.poster.findMany({
          where: { customerId, isActive: false },
          take: 3,
          select: {
            id: true,
            title: true,
            isActive: true,
            createdAt: true,
          },
        });
        console.log(`⚠️ [SOCIAL SERVICE] Ejemplos de posters inactivos:`, inactiveExamples);
      }
      
      // Obtener posts del usuario desde Prisma
      const posters = await prisma.poster.findMany({
        where: {
          customerId,
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
            take: 5, // Solo primeros 5 comentarios
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log(`✅ [SOCIAL SERVICE] Encontrados ${posters.length} posters para el usuario`);

      return posters.map((poster) => {
        const customerName = poster.customer
          ? `${poster.customer.firstName || ''} ${poster.customer.lastName || ''}`.trim() || 'Usuario'
          : 'Usuario';
        
        return {
          id: poster.id,
          customer_id: poster.customerId,
          customer_name: customerName,
          customer_email: poster.customer?.email || '',
          avatar_url: poster.customer?.profile?.avatar || null,
          title: poster.title || '',
          description: poster.description || '',
          image_url: poster.imageUrl || null,
          video_url: poster.videoUrl || null,
          likes_count: poster.likesCount,
          comments_count: poster.commentsCount,
          is_active: poster.isActive,
          created_at: poster.createdAt.toISOString(),
          updated_at: poster.updatedAt.toISOString(),
        };
      });
    } catch (error: any) {
      console.error(`❌ [SOCIAL SERVICE] Error obteniendo posters:`, error.message);
      return [];
    }
  }

  /**
   * Crear un nuevo poster (post)
   */
  async createPoster(data: {
    customerId: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    videoUrl?: string;
  }): Promise<any> {
    try {
      console.log(`📱 [SOCIAL SERVICE] Creando poster para usuario: ${data.customerId}`);

      // Validar que al menos haya título o descripción
      if (!data.title?.trim() && !data.description?.trim()) {
        throw new Error('Se requiere al menos un título o descripción');
      }

      // Validar que haya al menos una imagen o video
      if (!data.imageUrl && !data.videoUrl) {
        throw new Error('Se requiere al menos una imagen o video');
      }

      // Verificar que las tablas existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM posters LIMIT 1`.catch(() => {
          throw new Error('Tabla posters no existe');
        });
      } catch (tableError: any) {
        throw new Error('Tablas sociales no creadas. Ejecuta: npx prisma migrate dev');
      }

      const poster = await prisma.poster.create({
        data: {
          customerId: data.customerId,
          title: data.title || null,
          description: data.description || null,
          imageUrl: data.imageUrl || '',
          videoUrl: data.videoUrl || null,
          likesCount: 0,
          commentsCount: 0,
          isActive: true,
        },
      });

      console.log(`✅ [SOCIAL SERVICE] Poster creado: ${poster.id}`);

      return poster;
    } catch (error: any) {
      console.error(`❌ [SOCIAL SERVICE] Error creando poster:`, error.message);
      throw error;
    }
  }

  /**
   * Crear una nueva story
   */
  async createStory(data: {
    customerId: string;
    title?: string;
    description?: string;
    files: Array<{
      file_url: string;
      file_type: string;
      file_size?: number;
      order_index: number;
    }>;
  }): Promise<{ story: any; storyFiles: any[] }> {
    try {
      console.log(`📱 [SOCIAL SERVICE] Creando story para usuario: ${data.customerId}`);

      if (!data.files || data.files.length === 0) {
        throw new Error('Se requiere al menos un archivo para la story');
      }

      // Verificar que las tablas existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM stories_user LIMIT 1`.catch(() => {
          throw new Error('Tabla stories_user no existe');
        });
      } catch (tableError: any) {
        throw new Error('Tablas sociales no creadas. Ejecuta: npx prisma migrate dev');
      }

      // Calcular fecha de expiración (24 horas por defecto)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Crear la story
      const story = await prisma.storiesUser.create({
        data: {
          customerId: data.customerId,
          title: data.title || 'Mi Story',
          description: data.description || null,
          duration: 24,
          viewsCount: 0,
          isActive: true,
          expiresAt,
        },
      });

      // Crear los archivos de la story
      const storyFiles = await Promise.all(
        data.files.map((file) =>
          prisma.storyFile.create({
            data: {
              storyId: story.id,
              fileUrl: file.file_url,
              fileType: file.file_type,
              fileSize: file.file_size || null,
              orderIndex: file.order_index,
            },
          })
        )
      );

      console.log(`✅ [SOCIAL SERVICE] Story creada: ${story.id} con ${storyFiles.length} archivos`);

      return { story, storyFiles };
    } catch (error: any) {
      console.error(`❌ [SOCIAL SERVICE] Error creando story:`, error.message);
      throw error;
    }
  }

  /**
   * Obtener stories del usuario y sus amigos
   */
  async getStories(customerId: string): Promise<{
    userStories: any[];
    friendsStories: any[];
  }> {
    try {
      console.log(`📱 [SOCIAL SERVICE] Obteniendo stories para usuario: ${customerId}`);
      
      // Verificar que las tablas existen
      try {
        await prisma.$queryRaw`SELECT 1 FROM stories_user LIMIT 1`.catch(() => {
          throw new Error('Tabla stories_user no existe');
        });
      } catch (tableError: any) {
        console.warn(`⚠️ [SOCIAL SERVICE] Tablas sociales no creadas aún. Ejecuta: npx prisma migrate dev`);
        return { userStories: [], friendsStories: [] };
      }

      // Obtener stories del usuario
      const userStories = await prisma.storiesUser.findMany({
        where: {
          customerId,
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

      // TODO: Obtener stories de amigos cuando tengamos tabla de friends
      // Por ahora, devolver array vacío para friendsStories
      const friendsStories: any[] = [];

      console.log(`✅ [SOCIAL SERVICE] Encontradas ${userStories.length} stories del usuario`);

      // Formatear stories del usuario
      const formattedUserStories = userStories.map((story) => {
        const customerName = story.customer
          ? `${story.customer.firstName || ''} ${story.customer.lastName || ''}`.trim() || 'Usuario'
          : 'Usuario';

        return {
          id: story.id,
          customer_id: story.customerId,
          customer_name: customerName,
          customer_email: story.customer?.email || '',
          title: story.title,
          description: story.description || null,
          duration: story.duration,
          views_count: story.viewsCount,
          is_active: story.isActive,
          expires_at: story.expiresAt.toISOString(),
          created_at: story.createdAt.toISOString(),
          updated_at: story.updatedAt.toISOString(),
          files: story.storyFiles.map((file) => ({
            id: file.id,
            story_id: file.storyId,
            file_url: file.fileUrl,
            file_type: file.fileType,
            file_size: file.fileSize || 0,
            order_index: file.orderIndex,
          })),
        };
      });

      // Formatear stories de amigos (por ahora vacío)
      const formattedFriendsStories: any[] = [];

      return {
        userStories: formattedUserStories,
        friendsStories: formattedFriendsStories,
      };
    } catch (error: any) {
      console.error(`❌ [SOCIAL SERVICE] Error obteniendo stories:`, error.message);
      return { userStories: [], friendsStories: [] };
    }
  }
}

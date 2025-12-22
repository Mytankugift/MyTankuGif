import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';

export interface PersonalInfoResponse {
  customer_id: string;
  avatar_url?: string;
  status_message?: string;
  pseudonym?: string;
  banner_profile_url?: string;
  social_url?: any;
  birthday?: string;
  marital_status?: string;
  languages?: string[];
  interests?: string[];
  favorite_colors?: string[];
  favorite_activities?: string[];
  friends_count?: number;
}

export class UsersService {
  /**
   * Obtener información personal completa del usuario
   */
  async getPersonalInfo(userId: string): Promise<PersonalInfoResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        personalInfo: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Combinar información de User, UserProfile y PersonalInformation
    const avatarUrl = user.profile?.avatar || undefined;
    
    console.log(`🔍 [USERS] getPersonalInfo para usuario ${userId}`);
    console.log(`  Profile existe: ${!!user.profile}`);
    console.log(`  Avatar URL: ${avatarUrl || 'NO ENCONTRADO'}`);
    
    const response: PersonalInfoResponse = {
      customer_id: user.id,
      avatar_url: avatarUrl,
      status_message: user.personalInfo?.statusMessage || undefined,
      pseudonym: user.personalInfo?.pseudonym || undefined,
      banner_profile_url: user.profile?.banner || undefined,
      // TODO: Agregar más campos cuando expandamos el schema
      // social_url, birthday, marital_status, languages, etc.
      friends_count: 0, // TODO: Implementar cuando tengamos módulo de social
    };

    return response;
  }

  /**
   * Actualizar seudónimo
   */
  async updatePseudonym(userId: string, pseudonym: string): Promise<PersonalInfoResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { personalInfo: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Crear o actualizar información personal
    if (user.personalInfo) {
      await prisma.personalInformation.update({
        where: { userId },
        data: { pseudonym },
      });
    } else {
      await prisma.personalInformation.create({
        data: {
          userId,
          pseudonym,
        },
      });
    }

    return this.getPersonalInfo(userId);
  }

  /**
   * Actualizar mensaje de estado
   */
  async updateStatusMessage(userId: string, statusMessage: string): Promise<PersonalInfoResponse> {
    if (statusMessage.length > 200) {
      throw new BadRequestError('El mensaje de estado no puede exceder 200 caracteres');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { personalInfo: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Crear o actualizar información personal
    if (user.personalInfo) {
      await prisma.personalInformation.update({
        where: { userId },
        data: { statusMessage },
      });
    } else {
      await prisma.personalInformation.create({
        data: {
          userId,
          statusMessage,
        },
      });
    }

    return this.getPersonalInfo(userId);
  }

  /**
   * Actualizar avatar (URL)
   * TODO: Implementar upload a S3 cuando tengamos el módulo de archivos
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<PersonalInfoResponse> {
    console.log(`🔄 [USERS] Actualizando avatar para usuario ${userId}`);
    console.log(`  Avatar URL: ${avatarUrl}`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Crear o actualizar perfil
    if (user.profile) {
      console.log(`  ✅ Perfil existe, actualizando avatar...`);
      await prisma.userProfile.update({
        where: { userId },
        data: { avatar: avatarUrl },
      });
      console.log(`  ✅ Avatar actualizado en user_profile`);
    } else {
      console.log(`  ✅ Creando nuevo perfil con avatar...`);
      await prisma.userProfile.create({
        data: {
          userId,
          avatar: avatarUrl,
        },
      });
      console.log(`  ✅ Perfil creado con avatar`);
    }

    // Verificar que se guardó correctamente
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    
    console.log(`  🔍 Avatar guardado: ${updatedUser?.profile?.avatar || 'NO ENCONTRADO'}`);

    return this.getPersonalInfo(userId);
  }

  /**
   * Actualizar banner (URL)
   * TODO: Implementar upload a S3 cuando tengamos el módulo de archivos
   */
  async updateBanner(userId: string, bannerUrl: string): Promise<PersonalInfoResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Crear o actualizar perfil
    if (user.profile) {
      await prisma.userProfile.update({
        where: { userId },
        data: { banner: bannerUrl },
      });
    } else {
      await prisma.userProfile.create({
        data: {
          userId,
          banner: bannerUrl,
        },
      });
    }

    return this.getPersonalInfo(userId);
  }
}

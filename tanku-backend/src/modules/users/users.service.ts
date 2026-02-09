import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import {
  AddressDTO,
  UserWithAddressesDTO,
  UpdateUserDTO,
  CreateAddressDTO,
  UpdateAddressDTO,
  UserProfileDTO,
  UpdateUserProfileDTO,
  PersonalInformationDTO,
  UpdatePersonalInformationDTO,
  OnboardingDataDTO,
  UpdateOnboardingDataDTO,
  SocialLink,
} from '../../shared/dto/users.dto';
import { UserPublicDTO } from '../../shared/dto/auth.dto';
import type { Address, UserProfile, PersonalInformation } from '@prisma/client';

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
   * Buscar usuarios por nombre o email (para autocompletado de menciones)
   * Si query está vacío, retorna usuarios recientes
   * Filtra usuarios bloqueados si se proporciona viewerUserId
   */
  async searchUsers(query: string, limit: number = 10, viewerUserId?: string): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatar: string | null;
  }>> {
    let users;

    if (!query || query.trim().length < 1) {
      // Si no hay query, retornar usuarios recientes (últimos creados)
      users = await prisma.user.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          profile: {
            select: {
              avatar: true,
            },
          },
        },
      });
    } else {
      const searchTerm = query.trim().toLowerCase();

      // Priorizar búsqueda por nombre completo, luego username
      // Buscar por firstName + lastName combinado primero
      users = await prisma.user.findMany({
        where: {
          OR: [
            // Buscar por firstName o lastName individual
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            // Buscar por username
            { username: { contains: searchTerm, mode: 'insensitive' } },
            // Email solo como último recurso (no debería mostrarse)
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          profile: {
            select: {
              avatar: true,
            },
          },
        },
      });
    }

    // Filtrar usuarios bloqueados si hay viewerUserId
    if (viewerUserId) {
      const blockedUserIds = new Set<string>();
      
      // Usuarios que el viewer bloqueó
      const blockedByViewer = await prisma.friend.findMany({
        where: {
          userId: viewerUserId,
          status: 'blocked',
        },
        select: {
          friendId: true,
        },
      });
      blockedByViewer.forEach(b => blockedUserIds.add(b.friendId));

      // Usuarios que bloquearon al viewer
      const blockedViewer = await prisma.friend.findMany({
        where: {
          friendId: viewerUserId,
          status: 'blocked',
        },
        select: {
          userId: true,
        },
      });
      blockedViewer.forEach(b => blockedUserIds.add(b.userId));

      // Filtrar usuarios bloqueados
      users = users.filter(user => !blockedUserIds.has(user.id));
    }

    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username || null,
      avatar: user.profile?.avatar || null,
    }));
  }

  /**
   * Obtener usuarios por IDs (para menciones en comentarios)
   */
  async getUsersByIds(userIds: string[]): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatar: string | null;
  }>> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        profile: {
          select: {
            avatar: true,
          },
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatar: user.profile?.avatar || null,
    }));
  }

  /**
   * Buscar usuarios por IDs (para procesar menciones) - DEPRECATED, usar getUsersByIds
   */
  async findUsersByIds(userIds: string[]): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }>> {
    if (userIds.length === 0) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return users;
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
      try {
        await prisma.personalInformation.create({
          data: {
            userId,
            pseudonym,
          },
        });
      } catch (error: any) {
        // Si el error es de foreign key, el usuario no existe (aunque verificamos antes)
        if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint')) {
          console.error(`❌ [USERS] Error de foreign key al crear PersonalInformation para usuario ${userId}`);
          throw new NotFoundError(`Usuario no encontrado: ${userId}`);
        }
        throw error;
      }
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
      try {
        await prisma.personalInformation.create({
          data: {
            userId,
            statusMessage,
          },
        });
      } catch (error: any) {
        // Si el error es de foreign key, el usuario no existe (aunque verificamos antes)
        if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint')) {
          console.error(`❌ [USERS] Error de foreign key al crear PersonalInformation para usuario ${userId}`);
          throw new NotFoundError(`Usuario no encontrado: ${userId}`);
        }
        throw error;
      }
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

  /**
   * Mapper: Address de Prisma a AddressDTO
   */
  private mapAddressToDTO(address: Address): AddressDTO {
    return {
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      address1: address.address1,
      address2: address.detail,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefaultShipping: address.isDefaultShipping,
      isGiftAddress: address.isGiftAddress,
      metadata: address.metadata as Record<string, any> | undefined,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  /**
   * Obtener usuario actual con direcciones (NUEVO - Normalizado)
   */
  async getCurrentUserWithAddresses(userId: string): Promise<UserWithAddressesDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        addresses: {
          orderBy: [
            { isDefaultShipping: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const userDTO: UserPublicDTO = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      profile: user.profile
        ? {
            avatar: user.profile.avatar,
            banner: user.profile.banner,
            bio: user.profile.bio,
          }
        : null,
    };

    return {
      user: userDTO,
      addresses: user.addresses.map((addr) => this.mapAddressToDTO(addr)),
    };
  }

  /**
   * Obtener direcciones del usuario (NUEVO - Normalizado)
   */
  async getUserAddresses(userId: string): Promise<AddressDTO[]> {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefaultShipping: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return addresses.map((addr) => this.mapAddressToDTO(addr));
  }

  /**
   * Crear dirección para el usuario (NUEVO - Normalizado)
   */
  async createUserAddress(userId: string, addressData: CreateAddressDTO): Promise<AddressDTO> {
    // Si se marca como predeterminada, desmarcar las demás
    if (addressData.isDefaultShipping) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefaultShipping: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        firstName: addressData.firstName,
        lastName: addressData.lastName,
        phone: addressData.phone || null,
        address1: addressData.address1,
        detail: addressData.address2 || null,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        country: addressData.country.toUpperCase() || 'CO',
        isDefaultShipping: addressData.isDefaultShipping || false,
        isGiftAddress: addressData.isGiftAddress || false,
        metadata: addressData.metadata || undefined,
      },
    });

    return this.mapAddressToDTO(address);
  }

  /**
   * Actualizar dirección del usuario (NUEVO - Normalizado)
   */
  async updateUserAddress(userId: string, addressId: string, addressData: UpdateAddressDTO): Promise<AddressDTO> {
    // Verificar que la dirección pertenece al usuario
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      throw new NotFoundError('Dirección no encontrada');
    }

    // Si se marca como predeterminada, desmarcar las demás
    if (addressData.isDefaultShipping) {
      await prisma.address.updateMany({
        where: {
          userId,
          id: { not: addressId },
        },
        data: { isDefaultShipping: false },
      });
    }

    const updateData: any = {};
    if (addressData.firstName !== undefined) updateData.firstName = addressData.firstName;
    if (addressData.lastName !== undefined) updateData.lastName = addressData.lastName;
    if (addressData.phone !== undefined) updateData.phone = addressData.phone || null;
    if (addressData.address1 !== undefined) updateData.address1 = addressData.address1;
    if (addressData.address2 !== undefined) updateData.detail = addressData.address2 || null;
    if (addressData.city !== undefined) updateData.city = addressData.city;
    if (addressData.state !== undefined) updateData.state = addressData.state;
    if (addressData.postalCode !== undefined) updateData.postalCode = addressData.postalCode;
    if (addressData.country !== undefined) updateData.country = addressData.country.toUpperCase();
    if (addressData.isDefaultShipping !== undefined) updateData.isDefaultShipping = addressData.isDefaultShipping;
    if (addressData.isGiftAddress !== undefined) updateData.isGiftAddress = addressData.isGiftAddress;
    if (addressData.metadata !== undefined) updateData.metadata = addressData.metadata;

    const address = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });

    return this.mapAddressToDTO(address);
  }

  /**
   * Eliminar dirección del usuario (NUEVO - Normalizado)
   */
  async deleteUserAddress(userId: string, addressId: string): Promise<void> {
    // Verificar que la dirección pertenece al usuario
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      throw new NotFoundError('Dirección no encontrada');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });
  }

  /**
   * Actualizar información del usuario (NUEVO - Normalizado)
   */
  async updateUser(userId: string, updateData: UpdateUserDTO): Promise<UserPublicDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Validar que el username sea único si se está actualizando
    if (updateData.username !== undefined && updateData.username !== null && updateData.username !== user.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: updateData.username },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestError('Este username ya está en uso');
      }
    }

    const updateFields: any = {};
    if (updateData.firstName !== undefined) updateFields.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) updateFields.lastName = updateData.lastName;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.username !== undefined) {
      // Permitir establecer username a null o a un valor
      updateFields.username = updateData.username === '' ? null : updateData.username;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
      include: { profile: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      username: updatedUser.username,
      phone: updatedUser.phone,
      profile: updatedUser.profile
        ? {
            avatar: updatedUser.profile.avatar,
            banner: updatedUser.profile.banner,
            bio: updatedUser.profile.bio,
          }
        : null,
    };
  }

  // ==================== USER PROFILE METHODS ====================

  /**
   * Mapper: UserProfile de Prisma a UserProfileDTO
   */
  private mapUserProfileToDTO(profile: UserProfile): UserProfileDTO {
    // Parsear socialLinks desde JSON si existe
    let socialLinks: SocialLink[] | undefined = undefined;
    if (profile.socialLinks) {
      try {
        const parsed = typeof profile.socialLinks === 'string' 
          ? JSON.parse(profile.socialLinks) 
          : profile.socialLinks;
        socialLinks = Array.isArray(parsed) ? parsed : undefined;
      } catch (error) {
        console.error('Error parsing socialLinks:', error);
      }
    }

    return {
      id: profile.id,
      userId: profile.userId,
      avatar: profile.avatar,
      banner: profile.banner,
      bio: profile.bio,
      isPublic: profile.isPublic ?? true,
      allowGiftShipping: profile.allowGiftShipping ?? false,
      useMainAddressForGifts: profile.useMainAddressForGifts ?? false,
      socialLinks,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  /**
   * Obtener perfil del usuario
   */
  async getUserProfile(userId: string): Promise<UserProfileDTO | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    return this.mapUserProfileToDTO(profile);
  }

  /**
   * Crear o actualizar perfil del usuario
   */
  async upsertUserProfile(userId: string, updateData: UpdateUserProfileDTO): Promise<UserProfileDTO> {
    console.log('🔄 [USERS] upsertUserProfile - updateData:', JSON.stringify(updateData, null, 2));
    
    const updatePayload: any = {};
    
    if (updateData.bio !== undefined) {
      updatePayload.bio = updateData.bio;
    }
    if (updateData.isPublic !== undefined) {
      updatePayload.isPublic = updateData.isPublic;
    }
    if (updateData.allowGiftShipping !== undefined) {
      updatePayload.allowGiftShipping = updateData.allowGiftShipping;
    }
    if (updateData.useMainAddressForGifts !== undefined) {
      updatePayload.useMainAddressForGifts = updateData.useMainAddressForGifts;
    }
    if (updateData.socialLinks !== undefined) {
      updatePayload.socialLinks = updateData.socialLinks;
      console.log('📝 [USERS] Guardando socialLinks:', JSON.stringify(updateData.socialLinks, null, 2));
    }

    const createPayload: any = {
      userId,
      bio: updateData.bio || null,
      isPublic: updateData.isPublic !== undefined ? updateData.isPublic : true,
      allowGiftShipping: updateData.allowGiftShipping !== undefined ? updateData.allowGiftShipping : false,
      useMainAddressForGifts: updateData.useMainAddressForGifts !== undefined ? updateData.useMainAddressForGifts : false,
    };
    
    if (updateData.socialLinks !== undefined) {
      createPayload.socialLinks = updateData.socialLinks;
    }

    console.log('📦 [USERS] updatePayload:', JSON.stringify(updatePayload, null, 2));
    console.log('📦 [USERS] createPayload:', JSON.stringify(createPayload, null, 2));

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: updatePayload,
      create: createPayload,
    });

    console.log('✅ [USERS] Perfil guardado - socialLinks en DB:', profile.socialLinks);

    return this.mapUserProfileToDTO(profile);
  }

  /**
   * Actualizar avatar del usuario
   */
  async updateUserProfileAvatar(userId: string, avatarUrl: string): Promise<UserProfileDTO> {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        avatar: avatarUrl,
      },
      create: {
        userId,
        avatar: avatarUrl,
      },
    });

    return this.mapUserProfileToDTO(profile);
  }

  /**
   * Actualizar banner del usuario
   */
  async updateUserProfileBanner(userId: string, bannerUrl: string): Promise<UserProfileDTO> {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        banner: bannerUrl,
      },
      create: {
        userId,
        banner: bannerUrl,
      },
    });

    return this.mapUserProfileToDTO(profile);
  }

  // ==================== PERSONAL INFORMATION METHODS ====================

  /**
   * Mapper: PersonalInformation de Prisma a PersonalInformationDTO
   */
  private mapPersonalInformationToDTO(personalInfo: PersonalInformation): PersonalInformationDTO {
    return {
      id: personalInfo.id,
      userId: personalInfo.userId,
      pseudonym: personalInfo.pseudonym,
      statusMessage: personalInfo.statusMessage,
      createdAt: personalInfo.createdAt.toISOString(),
      updatedAt: personalInfo.updatedAt.toISOString(),
    };
  }

  /**
   * Obtener información personal del usuario
   */
  async getPersonalInformation(userId: string): Promise<PersonalInformationDTO | null> {
    const personalInfo = await prisma.personalInformation.findUnique({
      where: { userId },
    });

    if (!personalInfo) {
      return null;
    }

    return this.mapPersonalInformationToDTO(personalInfo);
  }

  /**
   * Crear o actualizar información personal del usuario
   */
  async upsertPersonalInformation(userId: string, updateData: UpdatePersonalInformationDTO): Promise<PersonalInformationDTO> {
    // Validar longitud del statusMessage
    if (updateData.statusMessage !== undefined && updateData.statusMessage !== null && updateData.statusMessage.length > 200) {
      throw new BadRequestError('El mensaje de estado no puede exceder 200 caracteres');
    }

    const personalInfo = await prisma.personalInformation.upsert({
      where: { userId },
      update: {
        pseudonym: updateData.pseudonym,
        statusMessage: updateData.statusMessage,
      },
      create: {
        userId,
        pseudonym: updateData.pseudonym || null,
        statusMessage: updateData.statusMessage || null,
      },
    });

    return this.mapPersonalInformationToDTO(personalInfo);
  }

  // ==================== ONBOARDING STATUS METHODS ====================

  /**
   * Obtener datos de onboarding desde PersonalInformation.metadata
   */
  async getOnboardingData(userId: string): Promise<OnboardingDataDTO | null> {
    const personalInfo = await prisma.personalInformation.findUnique({
      where: { userId },
    });

    if (!personalInfo) {
      return null;
    }

    // Obtener categoryInterests desde User
    const categoryInterests = await prisma.userCategoryInterest.findMany({
      where: { userId },
      select: { categoryId: true },
    });

    const metadata = (personalInfo.metadata as any) || {};
    const onboardingMetadata = metadata.onboarding || {};

    // Si hay birthDateString en metadata, usarlo; sino formatear desde birthDate
    // Soporta formato "YYYY-MM-DD" (nuevo) o "MM-DD" (legacy)
    let birthDateString = onboardingMetadata.birthDateString;
    
    if (!birthDateString && personalInfo.birthDate) {
      const year = personalInfo.birthDate.getFullYear();
      const month = String(personalInfo.birthDate.getMonth() + 1).padStart(2, '0');
      const day = String(personalInfo.birthDate.getDate()).padStart(2, '0');
      
      // Si el año es 2000, probablemente es legacy (solo mes/día), usar formato "MM-DD"
      // Si no, usar formato completo "YYYY-MM-DD"
      birthDateString = year === 2000 
        ? `${month}-${day}`
        : `${year}-${month}-${day}`;
    }

    return {
      birthDate: birthDateString,
      categoryIds: categoryInterests.map((ci) => ci.categoryId),
      activities: onboardingMetadata.activities || [],
      completedSteps: onboardingMetadata.completedSteps || [],
      lastCompletedAt: onboardingMetadata.lastCompletedAt || null,
    };
  }

  /**
   * Actualizar datos de onboarding en PersonalInformation
   */
  async updateOnboardingData(
    userId: string,
    updateData: UpdateOnboardingDataDTO
  ): Promise<OnboardingDataDTO> {
    // Verificar que el usuario existe antes de crear PersonalInformation
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      console.error(`❌ [USERS] Usuario ${userId} no existe en la base de datos`);
      throw new NotFoundError(`Usuario no encontrado: ${userId}`);
    }

    // Obtener o crear PersonalInformation
    let personalInfo = await prisma.personalInformation.findUnique({
      where: { userId },
    });

    if (!personalInfo) {
      try {
        personalInfo = await prisma.personalInformation.create({
          data: { userId },
        });
      } catch (error: any) {
        // Si el error es de foreign key, el usuario no existe (aunque verificamos antes)
        if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint')) {
          console.error(`❌ [USERS] Error de foreign key al crear PersonalInformation para usuario ${userId}`);
          console.error(`   Verificar que el usuario existe en la base de datos`);
          throw new NotFoundError(`Usuario no encontrado: ${userId}`);
        }
        throw error;
      }
    }

    // Preparar metadata
    const currentMetadata = (personalInfo.metadata as any) || {};
    const onboardingMetadata = currentMetadata.onboarding || {};

    // Preparar datos de actualización
    const updatePayload: any = {};

    // Actualizar birthDate si viene
    // Acepta formato "YYYY-MM-DD" o "MM-DD" (legacy)
    if (updateData.birthDate !== undefined) {
      if (!updateData.birthDate) {
        updatePayload.birthDate = null;
      } else if (typeof updateData.birthDate === 'string') {
        const parts = updateData.birthDate.split('-');
        
        if (parts.length === 3) {
          // Formato "YYYY-MM-DD" - fecha completa
          const [year, month, day] = parts.map(Number);
          if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            updatePayload.birthDate = new Date(year, month - 1, day);
          } else {
            updatePayload.birthDate = new Date(updateData.birthDate);
          }
        } else if (parts.length === 2) {
          // Formato "MM-DD" (legacy) - usar año base 2000
          const [month, day] = parts.map(Number);
          if (month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            updatePayload.birthDate = new Date(2000, month - 1, day);
          } else {
            updatePayload.birthDate = new Date(updateData.birthDate);
          }
        } else {
          // Intentar parsear como fecha completa
          updatePayload.birthDate = new Date(updateData.birthDate);
        }
      } else {
        updatePayload.birthDate = new Date(updateData.birthDate);
      }
    }

    // Actualizar metadata (actividades, pasos completados, fecha de nacimiento como string)
    const updatedMetadata = {
      ...currentMetadata,
      onboarding: {
        ...onboardingMetadata,
        activities: updateData.activities ?? onboardingMetadata.activities ?? [],
        completedSteps: updateData.completedSteps ?? onboardingMetadata.completedSteps ?? [],
        lastCompletedAt: new Date().toISOString(),
        // Guardar fecha de nacimiento como string en metadata (formato "YYYY-MM-DD" o "MM-DD")
        birthDateString: updateData.birthDate && typeof updateData.birthDate === 'string' 
          ? updateData.birthDate 
          : onboardingMetadata.birthDateString,
      },
    };
    updatePayload.metadata = updatedMetadata;

    // Actualizar PersonalInformation
    await prisma.personalInformation.update({
      where: { userId },
      data: updatePayload,
    });

    // Actualizar categorías de interés si vienen
    if (updateData.categoryIds !== undefined) {
      // Eliminar intereses actuales
      await prisma.userCategoryInterest.deleteMany({
        where: { userId },
      });

      // Crear nuevos intereses
      if (updateData.categoryIds.length > 0) {
        await prisma.userCategoryInterest.createMany({
          data: updateData.categoryIds.map((categoryId) => ({
            userId,
            categoryId,
          })),
        });
      }
    }

    // Retornar datos actualizados
    const updated = await prisma.personalInformation.findUnique({
      where: { userId },
    });

    if (!updated) {
      throw new NotFoundError('PersonalInformation no encontrado después de actualizar');
    }

    // Obtener categoryInterests desde User
    const categoryInterests = await prisma.userCategoryInterest.findMany({
      where: { userId },
      select: { categoryId: true },
    });

    const finalMetadata = (updated.metadata as any) || {};
    const finalOnboardingMetadata = finalMetadata.onboarding || {};

    return {
      birthDate: updated.birthDate?.toISOString() || null,
      categoryIds: categoryInterests.map((ci) => ci.categoryId),
      activities: finalOnboardingMetadata.activities || [],
      completedSteps: finalOnboardingMetadata.completedSteps || [],
      lastCompletedAt: finalOnboardingMetadata.lastCompletedAt || null,
    };
  }

  /**
   * Obtener información de usuario por ID considerando privacidad
   */
  /**
   * Obtener usuario por username (para rutas amigables)
   */
  async getUserByUsername(username: string, viewerUserId?: string): Promise<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string;
    username: string | null;
    profile: {
      avatar: string | null;
      banner: string | null;
      bio: string | null;
      isPublic: boolean;
    } | null;
    isOwnProfile: boolean;
    canViewProfile: boolean;
    areFriends: boolean;
    friendsCount?: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Usar el método existente getUserById con el ID encontrado
    return this.getUserById(user.id, viewerUserId);
  }

  async getUserById(userId: string, viewerUserId?: string): Promise<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string;
    username: string | null;
    profile: {
      avatar: string | null;
      banner: string | null;
      bio: string | null;
      isPublic: boolean;
    } | null;
    isOwnProfile: boolean;
    canViewProfile: boolean;
    areFriends: boolean;
    friendsCount?: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const isOwnProfile = viewerUserId === userId;

    // Si es el propio perfil, devolver toda la información
    if (isOwnProfile) {
      // Contar amigos del usuario
      const friendsCount = await prisma.friend.count({
        where: {
          OR: [
            { userId: userId, status: 'accepted' },
            { friendId: userId, status: 'accepted' },
          ],
        },
      });

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        profile: user.profile
          ? ({
              avatar: user.profile.avatar,
              banner: user.profile.banner,
              bio: user.profile.bio,
              isPublic: user.profile.isPublic ?? true,
            } as any)
          : null,
        isOwnProfile: true,
        canViewProfile: true,
        areFriends: false,
        friendsCount,
      };
    }

    // Si no hay viewer, mostrar siempre avatar, banner y bio, pero canViewProfile depende de si es público
    if (!viewerUserId) {
      const isPublic = user.profile?.isPublic ?? true;
      
      // Contar amigos del usuario
      const friendsCount = await prisma.friend.count({
        where: {
          OR: [
            { userId: userId, status: 'accepted' },
            { friendId: userId, status: 'accepted' },
          ],
        },
      });

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profile: user.profile
          ? ({
              avatar: user.profile.avatar,
              banner: user.profile.banner,
              bio: user.profile.bio,
              isPublic,
            } as any)
          : null,
        isOwnProfile: false,
        canViewProfile: isPublic,
        areFriends: false,
        friendsCount,
      };
    }

    // Verificar si hay bloqueo (bidireccional)
    const { FriendsService } = await import('../friends/friends.service');
    const friendsService = new FriendsService();
    const isBlocked = await friendsService.isBlocked(viewerUserId, userId);

    // Si hay bloqueo, retornar error
    if (isBlocked) {
      throw new NotFoundError('Este perfil no está disponible');
    }

    // Verificar si son amigos
    const areFriends = await friendsService.areFriends(viewerUserId, userId);

    // Contar amigos del usuario
    const friendsCount = await prisma.friend.count({
      where: {
        OR: [
          { userId: userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
    });

    const isPublic = user.profile?.isPublic ?? true;
    const canViewProfile = isPublic || areFriends;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      profile: user.profile
        ? {
            avatar: user.profile.avatar,
            banner: user.profile.banner,
            bio: user.profile.bio,
            isPublic,
          }
        : null,
      isOwnProfile: false,
      canViewProfile,
      areFriends,
      friendsCount,
    };
  }
}

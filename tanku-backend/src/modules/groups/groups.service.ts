import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';

export interface CreateGroupDTO {
  name: string;
  description?: string;
  memberIds?: string[]; // IDs de amigos a agregar al crear el grupo
}

export interface UpdateGroupDTO {
  name?: string;
  description?: string;
}

export interface GroupDTO {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      profile: {
        avatar: string | null;
      } | null;
    };
  }>;
  membersCount: number;
}

export class GroupsService {
  /**
   * Crear un nuevo grupo
   */
  async createGroup(userId: string, data: CreateGroupDTO): Promise<GroupDTO> {
    // Validar que los miembros sean amigos aceptados
    if (data.memberIds && data.memberIds.length > 0) {
      const friends = await prisma.friend.findMany({
        where: {
          OR: [
            { userId, friendId: { in: data.memberIds }, status: 'accepted' },
            { userId: { in: data.memberIds }, friendId: userId, status: 'accepted' },
          ],
        },
      });

      const validFriendIds = new Set(
        friends.map((f) => (f.userId === userId ? f.friendId : f.userId))
      );

      const invalidIds = data.memberIds.filter((id) => !validFriendIds.has(id));
      if (invalidIds.length > 0) {
        throw new BadRequestError(
          `Los siguientes IDs no son amigos aceptados: ${invalidIds.join(', ')}`
        );
      }
    }

    // Crear el grupo
    const group = await prisma.group.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        members: {
          create: (data.memberIds || []).map((memberId) => ({
            userId: memberId,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    return this.mapGroupToDTO(group);
  }

  /**
   * Obtener todos los grupos del usuario
   */
  async getGroups(userId: string): Promise<GroupDTO[]> {
    const groups = await prisma.group.findMany({
      where: { userId },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return groups.map((group) => this.mapGroupToDTO(group));
  }

  /**
   * Obtener un grupo por ID
   */
  async getGroupById(groupId: string, userId: string): Promise<GroupDTO> {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        userId, // Solo el dueño puede ver el grupo
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Grupo no encontrado');
    }

    return this.mapGroupToDTO(group);
  }

  /**
   * Actualizar un grupo
   */
  async updateGroup(groupId: string, userId: string, data: UpdateGroupDTO): Promise<GroupDTO> {
    // Verificar que el usuario sea el dueño
    const group = await prisma.group.findFirst({
      where: { id: groupId, userId },
    });

    if (!group) {
      throw new NotFoundError('Grupo no encontrado');
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    return this.mapGroupToDTO(updatedGroup);
  }

  /**
   * Eliminar un grupo
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const group = await prisma.group.findFirst({
      where: { id: groupId, userId },
    });

    if (!group) {
      throw new NotFoundError('Grupo no encontrado');
    }

    await prisma.group.delete({
      where: { id: groupId },
    });
  }

  /**
   * Agregar un miembro a un grupo
   */
  async addGroupMember(groupId: string, userId: string, memberId: string): Promise<GroupDTO> {
    // Verificar que el usuario sea el dueño
    const group = await prisma.group.findFirst({
      where: { id: groupId, userId },
    });

    if (!group) {
      throw new NotFoundError('Grupo no encontrado');
    }

    // Verificar que el miembro sea un amigo aceptado
    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId: memberId, status: 'accepted' },
          { userId: memberId, friendId: userId, status: 'accepted' },
        ],
      },
    });

    if (!friendship) {
      throw new BadRequestError('El usuario no es un amigo aceptado');
    }

    // Verificar que no esté ya en el grupo
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestError('El usuario ya está en el grupo');
    }

    // Agregar el miembro
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: memberId,
      },
    });

    // Retornar el grupo actualizado
    return this.getGroupById(groupId, userId);
  }

  /**
   * Eliminar un miembro de un grupo
   */
  async removeGroupMember(groupId: string, userId: string, memberId: string): Promise<GroupDTO> {
    // Verificar que el usuario sea el dueño
    const group = await prisma.group.findFirst({
      where: { id: groupId, userId },
    });

    if (!group) {
      throw new NotFoundError('Grupo no encontrado');
    }

    // Eliminar el miembro
    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId: memberId,
      },
    });

    // Retornar el grupo actualizado
    return this.getGroupById(groupId, userId);
  }

  /**
   * Obtener grupos recomendados (plantillas)
   */
  getRecommendedGroups(): Array<{ name: string; description: string }> {
    return [
      { name: 'Familia', description: 'Miembros de mi familia' },
      { name: 'Amigos Cercanos', description: 'Mis amigos más cercanos' },
      { name: 'Del Trabajo', description: 'Compañeros de trabajo' },
      { name: 'Universidad', description: 'Amigos de la universidad' },
      { name: 'Gym', description: 'Amigos del gimnasio' },
      { name: 'Vecinos', description: 'Vecinos y conocidos del barrio' },
    ];
  }

  /**
   * Mapear grupo a DTO
   */
  private mapGroupToDTO(group: any): GroupDTO {
    return {
      id: group.id,
      userId: group.userId,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      members: group.members.map((member: any) => ({
        id: member.id,
        userId: member.userId,
        user: {
          id: member.user.id,
          email: member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          profile: member.user.profile
            ? {
                avatar: member.user.profile.avatar,
              }
            : null,
        },
      })),
      membersCount: group.members.length,
    };
  }
}

import { prisma } from '../../config/database';
import {
  bumpGlobalAccountsCacheVersion,
  getCachedActiveUserIds,
  setCachedActiveUserIds,
} from './global-feed-accounts-cache';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/AppError';

export interface FeedGlobalAccountDTO {
  id: string;
  userId: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export class GlobalFeedAccountsService {
  invalidateCache(): void {
    bumpGlobalAccountsCacheVersion();
  }

  async getActiveUserIds(): Promise<string[]> {
    const cached = getCachedActiveUserIds();
    if (cached) return cached;

    const rows = await prisma.feedGlobalAccount.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { userId: true },
    });

    const ids = rows.map((r) => r.userId);
    setCachedActiveUserIds(ids);
    return ids;
  }

  private mapRow(
    row: {
      id: string;
      userId: string;
      active: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      user: {
        email: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        profile: { avatar: string | null } | null;
      };
    }
  ): FeedGlobalAccountDTO {
    return {
      id: row.id,
      userId: row.userId,
      email: row.user.email,
      username: row.user.username,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      avatar: row.user.profile?.avatar ?? null,
      active: row.active,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listAll(): Promise<FeedGlobalAccountDTO[]> {
    const rows = await prisma.feedGlobalAccount.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: {
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: { select: { avatar: true } },
          },
        },
      },
    });
    return rows.map((r) => this.mapRow(r));
  }

  async createByEmail(email: string): Promise<FeedGlobalAccountDTO> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new BadRequestError('Correo inválido');
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundError('No existe un usuario de la app con ese correo');
    }

    const existing = await prisma.feedGlobalAccount.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      if (existing.active) {
        throw new ConflictError('Esa cuenta ya está registrada como global del feed');
      }
      const updated = await prisma.feedGlobalAccount.update({
        where: { id: existing.id },
        data: { active: true },
        include: {
          user: {
            select: {
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              profile: { select: { avatar: true } },
            },
          },
        },
      });
      this.invalidateCache();
      return this.mapRow(updated);
    }

    const maxOrder = await prisma.feedGlobalAccount.aggregate({
      _max: { sortOrder: true },
    });
    const created = await prisma.feedGlobalAccount.create({
      data: {
        userId: user.id,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        user: {
          select: {
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: { select: { avatar: true } },
          },
        },
      },
    });
    this.invalidateCache();
    return this.mapRow(created);
  }

  async update(
    id: string,
    patch: { active?: boolean; sortOrder?: number }
  ): Promise<FeedGlobalAccountDTO> {
    const existing = await prisma.feedGlobalAccount.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Cuenta global no encontrada');
    }

    const updated = await prisma.feedGlobalAccount.update({
      where: { id },
      data: {
        ...(patch.active !== undefined && { active: patch.active }),
        ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
      },
      include: {
        user: {
          select: {
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: { select: { avatar: true } },
          },
        },
      },
    });
    this.invalidateCache();
    return this.mapRow(updated);
  }
}

export const globalFeedAccountsService = new GlobalFeedAccountsService();

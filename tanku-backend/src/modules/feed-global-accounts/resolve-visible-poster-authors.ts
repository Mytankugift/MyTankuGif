import { prisma } from '../../config/database';
import { globalFeedAccountsService } from './global-feed-accounts.service';

/**
 * IDs de autores cuyos posters pueden aparecer en feed / historias.
 * Incluye cuentas globales (siempre) + viewer + amigos (menos bloqueados no globales).
 */
export async function resolveVisiblePosterAuthorIds(
  viewerUserId?: string
): Promise<Set<string>> {
  const globalIds = await globalFeedAccountsService.getActiveUserIds();
  const globalSet = new Set(globalIds);
  const authorIds = new Set<string>(globalIds);

  if (!viewerUserId) {
    return authorIds;
  }

  authorIds.add(viewerUserId);

  try {
    const [friends, blockedUserIds, blockedByUserIds] = await Promise.all([
      prisma.friend.findMany({
        where: {
          OR: [
            { userId: viewerUserId, status: 'accepted' },
            { friendId: viewerUserId, status: 'accepted' },
          ],
        },
        select: { userId: true, friendId: true },
      }),
      prisma.friend.findMany({
        where: { userId: viewerUserId, status: 'blocked' },
        select: { friendId: true },
      }),
      prisma.friend.findMany({
        where: { friendId: viewerUserId, status: 'blocked' },
        select: { userId: true },
      }),
    ]);

    friends.forEach((f) => {
      if (f.userId === viewerUserId) authorIds.add(f.friendId);
      if (f.friendId === viewerUserId) authorIds.add(f.userId);
    });

    const allBlockedIds = new Set<string>([
      ...blockedUserIds.map((b) => b.friendId),
      ...blockedByUserIds.map((b) => b.userId),
    ]);

    allBlockedIds.forEach((blockedId) => {
      if (!globalSet.has(blockedId)) {
        authorIds.delete(blockedId);
      }
    });
  } catch (error: any) {
    console.warn(
      `⚠️ [FEED] Error resolviendo amigos para posters:`,
      error?.message
    );
  }

  return authorIds;
}

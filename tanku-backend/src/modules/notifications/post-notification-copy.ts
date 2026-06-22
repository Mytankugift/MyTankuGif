/**
 * Copy para notificaciones agrupadas de publicaciones (likes / comentarios).
 * Título = quién interactuó; mensaje = acción o preview del último comentario.
 */

import type { PrismaClient } from '@prisma/client';

export type PostInteractionKind = 'post_like' | 'post_comment';

export type PostNotificationCopy = {
  title: string;
  message: string;
};

export function resolveActorName(
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null
): string {
  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`.trim();
  if (user?.firstName) return user.firstName.trim();
  return user?.email?.split('@')[0] || 'Alguien';
}

/** Título: nombre del actor o grupo ("Ana y 2 más"). */
export function buildActorGroupTitle(names: string[], count: number): string {
  if (count === 1) return names[0] ?? 'Alguien';
  if (count === 2) return `${names[0]} y ${names[1]}`;
  return `${names[0]} y ${count - 1} más`;
}

export type MentionUser = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function mentionDisplayName(user: MentionUser): string {
  if (user.username?.trim()) return user.username.trim();
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`.trim();
  if (user.firstName?.trim()) return user.firstName.trim();
  return 'usuario';
}

function parseMentionUserIds(content: string, mentionedUserIds?: string[] | null): string[] {
  const ids = new Set<string>(mentionedUserIds ?? []);
  const markerRegex = /@\{([a-zA-Z0-9_-]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = markerRegex.exec(content)) !== null) {
    ids.add(match[1]);
  }
  const legacyRegex = /@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/g;
  while ((match = legacyRegex.exec(content)) !== null) {
    ids.add(match[2]);
  }
  return [...ids];
}

/** Sustituye @{userId}, @nombre|id y @id largos por @username legible. */
export function replaceCommentMentionMarkers(
  content: string,
  usersById: Map<string, MentionUser>
): string {
  if (!content) return content;

  let result = content;

  for (const [userId, user] of usersById) {
    const display = mentionDisplayName(user);
    const escaped = `@{${userId}}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), `@${display}`);
  }

  result = result.replace(/@([^|@]+?)\|([a-zA-Z0-9_-]{20,})/g, (_full, _name, userId: string) => {
    const user = usersById.get(userId);
    return user ? `@${mentionDisplayName(user)}` : '@usuario';
  });

  result = result.replace(/@([a-zA-Z0-9_-]{20,})(?![a-zA-Z0-9_-])/g, (full, userId: string) => {
    const user = usersById.get(userId);
    return user ? `@${mentionDisplayName(user)}` : full;
  });

  result = result.replace(/@\{[a-zA-Z0-9_-]+\}/g, '@usuario');

  return result.replace(/\s+/g, ' ').trim();
}

/** Preview de comentario con menciones resueltas desde BD. */
export async function formatCommentPreviewResolved(
  prisma: PrismaClient,
  content: string,
  mentionedUserIds?: string[] | null,
  maxLen = 120
): Promise<string> {
  const ids = parseMentionUserIds(content, mentionedUserIds);
  const users =
    ids.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, username: true, firstName: true, lastName: true },
        })
      : [];

  const usersById = new Map(users.map((u) => [u.id, u]));
  const stripped = replaceCommentMentionMarkers(content, usersById);
  if (!stripped) return 'Comentó tu publicación';
  if (stripped.length <= maxLen) return stripped;
  return `${stripped.slice(0, maxLen - 1)}…`;
}

/** Quita menciones técnicas @{id} del preview (sin BD). */
export function formatCommentPreview(content: string, maxLen = 120): string {
  const stripped = replaceCommentMentionMarkers(content, new Map());
  if (!stripped) return 'Comentó tu publicación';
  if (stripped.length <= maxLen) return stripped;
  return `${stripped.slice(0, maxLen - 1)}…`;
}

export function buildPostLikeCopy(names: string[], count: number): PostNotificationCopy {
  const title = buildActorGroupTitle(names, count);
  const message =
    count === 1 ? 'Le dio like a tu publicación' : 'Le dieron like a tu publicación';
  return { title, message };
}

export function buildPostCommentCopy(
  names: string[],
  count: number,
  latestCommentContent: string | null
): PostNotificationCopy {
  let title: string;
  if (count === 1) {
    title = `${names[0]} comentó`;
  } else if (count === 2) {
    title = `${names[0]} y ${names[1]} comentaron`;
  } else {
    title = `${names[0]} y ${count - 1} más comentaron`;
  }

  const message = latestCommentContent?.trim()
    ? formatCommentPreview(latestCommentContent)
    : 'Comentó en tu publicación';

  return { title, message };
}

export function getCommentMentionCopy(
  commenterName: string,
  commentContent: string
): PostNotificationCopy {
  return {
    title: `${commenterName} te mencionó`,
    message: formatCommentPreview(commentContent),
  };
}

export function getCommentReplyCopy(
  commenterName: string,
  commentContent: string
): PostNotificationCopy {
  return {
    title: `${commenterName} respondió tu comentario`,
    message: formatCommentPreview(commentContent),
  };
}

export function buildCommentLikeCopy(
  likesCount: number,
  commentPreview: string | null
): PostNotificationCopy {
  const title =
    likesCount === 1
      ? 'Tienes 1 me gusta en tu comentario'
      : `Tienes ${likesCount} me gustas en tu comentario`;
  const message = commentPreview?.trim() || 'Alguien reaccionó a tu comentario';
  return { title, message };
}

export function isLegacyPostInteractionTitle(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes('nuevo like en tu publicación') || t.includes('nuevo comentario en tu publicación');
}

export function needsPostCopyRefresh(
  title: string,
  message: string,
  type?: string
): boolean {
  if (isLegacyPostInteractionTitle(title)) return true;
  if (message.includes(' · ')) return true;
  if (/@\{[a-zA-Z0-9_-]+\}/.test(message)) return true;
  const lowered = title.toLowerCase();
  if (type === 'post_comment' && !lowered.includes('coment')) return true;
  return false;
}

/** Calcula título/mensaje desde actores ya resueltos. */
export async function computePostInteractionCopy(
  prisma: PrismaClient,
  params: {
    ownerId: string;
    posterId: string;
    kind: PostInteractionKind;
    names: string[];
    count: number;
  }
): Promise<PostNotificationCopy> {
  const { ownerId, posterId, kind, names, count } = params;

  if (kind === 'post_like') {
    return buildPostLikeCopy(names, count);
  }

  const latestComment = await prisma.posterComment.findFirst({
    where: { posterId, customerId: { not: ownerId }, isActive: true },
    orderBy: { createdAt: 'desc' },
    select: { content: true, mentions: true },
  });

  let mentions: string[] | undefined;
  if (latestComment?.mentions) {
    try {
      if (Array.isArray(latestComment.mentions)) {
        mentions = latestComment.mentions as string[];
      } else if (typeof latestComment.mentions === 'string') {
        mentions = JSON.parse(latestComment.mentions);
      }
    } catch {
      mentions = undefined;
    }
  }

  const preview = latestComment?.content?.trim()
    ? await formatCommentPreviewResolved(prisma, latestComment.content, mentions)
    : null;

  return buildPostCommentCopy(names, count, preview);
}

/**
 * Copy para notificaciones de amistad.
 */

import type { PostNotificationCopy } from './post-notification-copy';
import { buildActorGroupTitle, resolveActorName } from './post-notification-copy';

/** Solicitudes pendientes ≤ este valor → filas individuales; por encima → digest. */
export const FRIEND_REQUEST_DIGEST_THRESHOLD = 5;
export const FRIEND_REQUEST_DIGEST_GROUP_KEY = 'friend_request:digest';

export function getFriendRequestCopy(
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null
): PostNotificationCopy {
  const name = resolveActorName(user);
  return {
    title: name,
    message: 'Quiere ser tu amigo',
  };
}

export function getFriendRequestDigestCopy(
  names: string[],
  count: number
): PostNotificationCopy {
  return {
    title: buildActorGroupTitle(names, count),
    message: 'Quieren ser tu amigo',
  };
}

export function getFriendAcceptedCopy(
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null
): PostNotificationCopy {
  const name = resolveActorName(user);
  return {
    title: `${name} te aceptó`,
    message: 'Ahora son amigos',
  };
}

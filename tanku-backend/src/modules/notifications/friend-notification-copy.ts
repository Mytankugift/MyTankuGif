/**
 * Copy para notificaciones de amistad.
 */

import type { PostNotificationCopy } from './post-notification-copy';
import { resolveActorName } from './post-notification-copy';

export function getFriendRequestCopy(
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null
): PostNotificationCopy {
  const name = resolveActorName(user);
  return {
    title: name,
    message: 'Quiere ser tu amigo',
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

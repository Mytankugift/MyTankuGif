/**
 * Consolida notificaciones duplicadas en filas-grupo (group_key).
 *
 * - Pedidos: order_update, stalkergift_order_update → una fila por (usuario, orden)
 * - Publicaciones: post_like, post_comment → una fila por (dueño, publicación), recalculada desde BD
 * - Soporte: support_case_status, support_case_reply → una fila por (usuario, pedido)
 *
 * Uso:
 *   npm run backfill:notification-groups              # aplica todo
 *   npm run backfill:notification-groups -- --dry     # solo reporta
 *   npm run backfill:notification-groups -- --dry --scope=orders
 *   npm run backfill:notification-groups -- --scope=posts
 *   npm run backfill:notification-groups -- --scope=support
 *   npm run backfill:notification-groups -- --scope=social
 *   npm run backfill:notification-groups -- --scope=events
 */

import { prisma } from '../src/config/database';
import {
  getOrderStatusNotificationCopy,
  getStalkerGiftOrderNotificationCopy,
} from '../src/modules/notifications/order-notification-copy';
import {
  formatSupportCaseLabel,
  getSupportCaseReplyCopy,
} from '../src/modules/notifications/support-notification-copy';
import {
  computePostInteractionCopy,
  formatCommentPreviewResolved,
  getCommentMentionCopy,
  needsPostCopyRefresh,
  resolveActorName,
} from '../src/modules/notifications/post-notification-copy';
import {
  getFriendAcceptedCopy,
  getFriendRequestCopy,
} from '../src/modules/notifications/friend-notification-copy';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

const DRY_RUN = process.argv.includes('--dry') || process.argv.includes('--dry-run');

function parseScope(): 'all' | 'orders' | 'posts' | 'support' | 'social' | 'events' {
  const arg = process.argv.find((a) => a.startsWith('--scope='));
  const value = arg?.split('=')[1];
  if (
    value === 'orders' ||
    value === 'posts' ||
    value === 'support' ||
    value === 'social' ||
    value === 'events'
  ) {
    return value;
  }
  return 'all';
}

type NotificationRow = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  groupKey: string | null;
  createdAt: Date;
};

function extractOrderId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const orderId = (data as Record<string, unknown>).orderId;
  return typeof orderId === 'string' ? orderId : null;
}

function extractPosterId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const posterId = (data as Record<string, unknown>).posterId;
  return typeof posterId === 'string' ? posterId : null;
}


async function resolveStalkerGiftRole(
  orderId: string,
  userId: string
): Promise<'receiver' | 'sender'> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      stalkerGift: { select: { senderId: true } },
    },
  });
  if (order?.stalkerGift?.senderId === userId) return 'sender';
  return 'receiver';
}

async function backfillOrderNotifications(): Promise<void> {
  console.log('\n📦 Pedidos (order_update / stalkergift_order_update)\n');

  const rows = await prisma.notification.findMany({
    where: { type: { in: ['order_update', 'stalkergift_order_update'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      data: true,
      isRead: true,
      groupKey: true,
      createdAt: true,
    },
  });

  const groups = new Map<string, NotificationRow[]>();
  let skippedNoOrderId = 0;

  for (const row of rows) {
    const orderId = extractOrderId(row.data);
    if (!orderId) {
      skippedNoOrderId++;
      continue;
    }
    const key = `${row.userId}:${row.type}:${orderId}`;
    const list = groups.get(key) ?? [];
    list.push(row as NotificationRow);
    groups.set(key, list);
  }

  let groupsProcessed = 0;
  let groupsSkipped = 0;
  let deleted = 0;
  let updated = 0;

  for (const [key, groupRows] of groups) {
    const [, type, orderId] = key.split(':');
    const targetGroupKey = `${type}:${orderId}`;

    groupRows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const keeper =
      groupRows.find((r) => r.groupKey === targetGroupKey) ?? groupRows[0];
    const toDelete = groupRows.filter((r) => r.id !== keeper.id);

    if (groupRows.length === 1 && keeper.groupKey === targetGroupKey) {
      groupsSkipped++;
      continue;
    }

    const data = (keeper.data ?? {}) as Record<string, unknown>;
    const newStatus = typeof data.newStatus === 'string' ? data.newStatus : null;

    let title = keeper.title;
    let message = keeper.message;
    if (newStatus) {
      if (type === 'stalkergift_order_update') {
        const role = await resolveStalkerGiftRole(orderId, keeper.userId);
        const copy = getStalkerGiftOrderNotificationCopy(role, newStatus);
        title = copy.title;
        message = copy.message;
      } else {
        const copy = getOrderStatusNotificationCopy(newStatus);
        title = copy.title;
        message = copy.message;
      }
    }

    const isRead = groupRows.every((r) => r.isRead);
    const createdAt = groupRows[0].createdAt;

    groupsProcessed++;
    console.log(
      `   ${key}: conservar ${keeper.id.slice(0, 8)}…, borrar ${toDelete.length}, groupKey=${targetGroupKey}`
    );

    if (DRY_RUN) continue;

    if (toDelete.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
      deleted += toDelete.length;
    }

    await prisma.notification.update({
      where: { id: keeper.id },
      data: {
        groupKey: targetGroupKey,
        title,
        message,
        isRead,
        readAt: isRead ? keeper.createdAt : null,
        createdAt,
      },
    });
    updated++;
  }

  console.log(`\n   Filas leídas: ${rows.length}`);
  console.log(`   Grupos: ${groups.size} (${groupsProcessed} procesados, ${groupsSkipped} ya OK)`);
  console.log(`   Sin orderId en data: ${skippedNoOrderId}`);
  if (!DRY_RUN) {
    console.log(`   Actualizadas: ${updated}`);
    console.log(`   Eliminadas: ${deleted}`);
  } else {
    console.log('   (dry-run, no se escribió)');
  }
}

async function backfillPostNotifications(): Promise<void> {
  console.log('\n💬 Publicaciones (post_like / post_comment)\n');

  const rows = await prisma.notification.findMany({
    where: { type: { in: ['post_like', 'post_comment'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      data: true,
      isRead: true,
      groupKey: true,
      createdAt: true,
    },
  });

  const groups = new Map<string, NotificationRow[]>();
  let skippedNoPosterId = 0;

  for (const row of rows) {
    const posterId = extractPosterId(row.data);
    if (!posterId) {
      skippedNoPosterId++;
      continue;
    }
    const kind = row.type as 'post_like' | 'post_comment';
    const key = `${row.userId}:${kind}:${posterId}`;
    const list = groups.get(key) ?? [];
    list.push(row as NotificationRow);
    groups.set(key, list);
  }

  let groupsProcessed = 0;
  let groupsSkipped = 0;
  let deleted = 0;
  let updated = 0;
  let removedEmpty = 0;

  const actorSelect = {
    customerId: true,
    customer: { select: { firstName: true, lastName: true, email: true } },
  };

  for (const [key, groupRows] of groups) {
    const [ownerId, kind, posterId] = key.split(':') as [
      string,
      'post_like' | 'post_comment',
      string,
    ];
    const targetGroupKey = `${kind}:${posterId}`;

    const actorRows =
      kind === 'post_like'
        ? await prisma.posterReaction.findMany({
            where: { posterId, customerId: { not: ownerId } },
            distinct: ['customerId'],
            orderBy: { createdAt: 'desc' },
            select: actorSelect,
          })
        : await prisma.posterComment.findMany({
            where: { posterId, customerId: { not: ownerId }, isActive: true },
            distinct: ['customerId'],
            orderBy: { createdAt: 'desc' },
            select: actorSelect,
          });

    const count = actorRows.length;
    const allIds = groupRows.map((r) => r.id);

    if (count === 0) {
      groupsProcessed++;
      console.log(`   ${key}: sin actores en BD → borrar ${allIds.length} notificación(es)`);
      if (!DRY_RUN) {
        await prisma.notification.deleteMany({ where: { id: { in: allIds } } });
        deleted += allIds.length;
        removedEmpty += allIds.length;
      }
      continue;
    }

    groupRows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const keeper =
      groupRows.find((r) => r.groupKey === targetGroupKey) ?? groupRows[0];
    const toDelete = groupRows.filter((r) => r.id !== keeper.id);

    if (
      groupRows.length === 1 &&
      keeper.groupKey === targetGroupKey &&
      !needsPostCopyRefresh(keeper.title, keeper.message, keeper.type)
    ) {
      groupsSkipped++;
      continue;
    }

    const names = actorRows.slice(0, 3).map((r) => resolveActorName(r.customer));
    const lastActor = actorRows[0];
    const { title, message } = await computePostInteractionCopy(prisma, {
      ownerId,
      posterId,
      kind,
      names,
      count,
    });
    const data = {
      posterId,
      type: kind,
      actorId: lastActor.customerId,
      actorName: names[0],
      count,
    };
    const isRead = groupRows.every((r) => r.isRead);
    const createdAt = groupRows[0].createdAt;

    groupsProcessed++;
    console.log(
      `   ${key}: conservar ${keeper.id.slice(0, 8)}…, borrar ${toDelete.length}, título→${title.slice(0, 24)}`
    );

    if (DRY_RUN) continue;

    if (toDelete.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
      deleted += toDelete.length;
    }

    await prisma.notification.update({
      where: { id: keeper.id },
      data: {
        groupKey: targetGroupKey,
        title,
        message,
        data,
        isRead,
        readAt: isRead ? keeper.createdAt : null,
        createdAt,
      },
    });
    updated++;
  }

  console.log(`\n   Filas leídas: ${rows.length}`);
  console.log(`   Grupos: ${groups.size} (${groupsProcessed} procesados, ${groupsSkipped} ya OK)`);
  console.log(`   Sin posterId en data: ${skippedNoPosterId}`);
  if (!DRY_RUN) {
    console.log(`   Actualizadas: ${updated}`);
    console.log(`   Eliminadas: ${deleted} (${removedEmpty} sin actores reales)`);
  } else {
    console.log('   (dry-run, no se escribió)');
  }
}

async function backfillSupportNotifications(): Promise<void> {
  console.log('\n🛟 Soporte (support_case_status / support_case_reply)\n');

  const rows = await prisma.notification.findMany({
    where: { type: { in: ['support_case_status', 'support_case_reply'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      data: true,
      isRead: true,
      groupKey: true,
      createdAt: true,
    },
  });

  const groups = new Map<string, NotificationRow[]>();
  let skippedNoOrderId = 0;

  for (const row of rows) {
    const orderId = extractOrderId(row.data);
    if (!orderId) {
      skippedNoOrderId++;
      continue;
    }
    const key = `${row.userId}:${orderId}`;
    const list = groups.get(key) ?? [];
    list.push(row as NotificationRow);
    groups.set(key, list);
  }

  let groupsProcessed = 0;
  let groupsSkipped = 0;
  let deleted = 0;
  let updated = 0;

  for (const [key, groupRows] of groups) {
    const orderId = key.split(':').slice(1).join(':');
    const targetGroupKey = `support_order:${orderId}`;

    groupRows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const keeper =
      groupRows.find((r) => r.groupKey === targetGroupKey) ?? groupRows[0];
    const toDelete = groupRows.filter((r) => r.id !== keeper.id);

    const keeperData = (keeper.data ?? {}) as Record<string, unknown>;
    const caseLabel = formatSupportCaseLabel(
      typeof keeperData.supportCaseRef === 'string' ? keeperData.supportCaseRef : null,
      typeof keeperData.supportCaseId === 'string' ? keeperData.supportCaseId : keeper.id
    );
    const copy =
      keeper.type === 'support_case_reply'
        ? getSupportCaseReplyCopy(caseLabel, keeper.message)
        : { title: caseLabel, message: keeper.message };

    const needsUpdate =
      groupRows.length > 1 ||
      keeper.groupKey !== targetGroupKey ||
      keeper.title !== copy.title;

    if (!needsUpdate) {
      groupsSkipped++;
      continue;
    }

    const isRead = groupRows.every((r) => r.isRead);
    const createdAt = groupRows[0].createdAt;

    groupsProcessed++;
    console.log(
      `   ${key}: conservar ${keeper.id.slice(0, 8)}… (${keeper.type}), borrar ${toDelete.length}, título→${copy.title}`
    );

    if (DRY_RUN) continue;

    if (toDelete.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
      deleted += toDelete.length;
    }

    await prisma.notification.update({
      where: { id: keeper.id },
      data: {
        groupKey: targetGroupKey,
        type: keeper.type,
        title: copy.title,
        message: copy.message,
        data: keeper.data as object,
        isRead,
        readAt: isRead ? keeper.createdAt : null,
        createdAt,
      },
    });
    updated++;
  }

  console.log(`\n   Filas leídas: ${rows.length}`);
  console.log(`   Grupos: ${groups.size} (${groupsProcessed} procesados, ${groupsSkipped} ya OK)`);
  console.log(`   Sin orderId en data: ${skippedNoOrderId}`);
  if (!DRY_RUN) {
    console.log(`   Actualizadas: ${updated}`);
    console.log(`   Eliminadas: ${deleted}`);
  } else {
    console.log('   (dry-run, no se escribió)');
  }
}

function needsSocialCopyRefresh(type: string, title: string, message: string): boolean {
  const t = title.toLowerCase();
  if (type === 'friend_accepted') {
    return t.includes('solicitud de amistad aceptada') || /aceptó tu solicitud/i.test(message);
  }
  if (type === 'friend_request') {
    return t.includes('nueva solicitud de amistad') || /te envió una solicitud/i.test(message);
  }
  if (type === 'comment_mention') {
    return (
      t.includes('te mencionaron') ||
      /te mencionó en un comentario/i.test(message) ||
      /@\{[a-zA-Z0-9_-]+\}/.test(message)
    );
  }
  return false;
}

function extractActorId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  for (const key of ['fromUserId', 'friendId', 'actorId', 'userId', 'senderId']) {
    if (typeof d[key] === 'string') return d[key];
  }
  return null;
}

function extractCommentId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const commentId = (data as Record<string, unknown>).commentId;
  return typeof commentId === 'string' ? commentId : null;
}

async function backfillSocialNotifications(): Promise<void> {
  console.log('\n👥 Social (friend_request / friend_accepted / comment_mention)\n');

  const rows = await prisma.notification.findMany({
    where: { type: { in: ['friend_request', 'friend_accepted', 'comment_mention'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      data: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!needsSocialCopyRefresh(row.type, row.title, row.message)) {
      skipped++;
      continue;
    }

    let actorId = extractActorId(row.data);
    if (!actorId && row.type === 'comment_mention') {
      const commentId = extractCommentId(row.data);
      if (commentId) {
        const comment = await prisma.posterComment.findUnique({
          where: { id: commentId },
          select: { userId: true },
        });
        actorId = comment?.userId ?? null;
      }
    }

    if (!actorId) {
      console.log(`   ⚠️  ${row.id.slice(0, 8)}… (${row.type}): sin actorId, omitida`);
      skipped++;
      continue;
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, firstName: true, lastName: true, email: true, username: true, profile: { select: { avatar: true } } },
    });

    if (!actor) {
      skipped++;
      continue;
    }

    let copy: { title: string; message: string };
    if (row.type === 'friend_request') {
      copy = getFriendRequestCopy(actor);
    } else if (row.type === 'friend_accepted') {
      copy = getFriendAcceptedCopy(actor);
    } else {
      const commentId = extractCommentId(row.data);
      let content = row.message;
      let mentions: string[] | undefined;
      if (commentId) {
        const comment = await prisma.posterComment.findUnique({
          where: { id: commentId },
          select: { content: true, mentions: true },
        });
        if (comment?.content) content = comment.content;
        if (comment?.mentions) {
          try {
            if (Array.isArray(comment.mentions)) {
              mentions = comment.mentions as string[];
            } else if (typeof comment.mentions === 'string') {
              mentions = JSON.parse(comment.mentions);
            }
          } catch {
            mentions = undefined;
          }
        }
      }
      const preview = await formatCommentPreviewResolved(prisma, content, mentions);
      copy = getCommentMentionCopy(resolveActorName(actor), preview);
    }

    const data = {
      ...(typeof row.data === 'object' && row.data && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {}),
      actorId: actor.id,
      ...(row.type === 'friend_request'
        ? {
            fromUserId: actor.id,
            fromUsername: actor.username,
            fromAvatar: actor.profile?.avatar ?? null,
          }
        : {}),
      ...(row.type === 'friend_accepted'
        ? {
            friendId: actor.id,
            friendUsername: actor.username,
            friendAvatar: actor.profile?.avatar ?? null,
          }
        : {}),
      ...(row.type === 'comment_mention' ? { fromUserId: actor.id } : {}),
    };

    console.log(`   ${row.id.slice(0, 8)}… (${row.type}): "${row.title}" → "${copy.title}"`);

    if (DRY_RUN) continue;

    await prisma.notification.update({
      where: { id: row.id },
      data: {
        title: copy.title,
        message: copy.message,
        data: data as object,
      },
    });
    updated++;
  }

  console.log(`\n   Filas leídas: ${rows.length}`);
  console.log(`   Actualizadas: ${DRY_RUN ? 0 : updated}`);
  console.log(`   Omitidas: ${skipped}`);
  if (DRY_RUN) console.log('   (dry-run, no se escribió)');

  if (!DRY_RUN) {
    await backfillFriendRequestDigest();
    await backfillFriendAcceptedGroups();
  } else {
    console.log('\n   (dry-run: omitida sync friend_request digest/individuales)');
    await backfillFriendAcceptedGroups();
  }
}

async function backfillFriendAcceptedGroups(): Promise<void> {
  console.log('\n🤝 friend_accepted → groupKey (deduplicar)\n');

  const rows = await prisma.notification.findMany({
    where: { type: 'friend_accepted' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      data: true,
      isRead: true,
      groupKey: true,
      createdAt: true,
    },
  });

  const groups = new Map<string, typeof rows>();
  let skippedNoActor = 0;

  for (const row of rows) {
    const data = row.data as Record<string, unknown> | null;
    const actorId =
      typeof data?.friendId === 'string'
        ? data.friendId
        : typeof data?.actorId === 'string'
          ? data.actorId
          : null;
    if (!actorId) {
      skippedNoActor++;
      continue;
    }
    const key = `${row.userId}:friend_accepted:${actorId}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let groupsProcessed = 0;
  let groupsSkipped = 0;
  let deleted = 0;
  let updated = 0;

  for (const [key, groupRows] of groups) {
    const targetGroupKey = `friend_accepted:${key.split(':').slice(2).join(':')}`;
    const keeper =
      groupRows.find((r) => r.groupKey === targetGroupKey) ?? groupRows[0];
    const toDelete = groupRows.filter((r) => r.id !== keeper.id);
    const needsUpdate =
      toDelete.length > 0 || keeper.groupKey !== targetGroupKey;

    if (!needsUpdate) {
      groupsSkipped++;
      continue;
    }

    groupsProcessed++;
    console.log(
      `   ${key}: conservar ${keeper.id.slice(0, 8)}…, borrar ${toDelete.length}, groupKey→${targetGroupKey}`
    );

    if (DRY_RUN) continue;

    if (toDelete.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
      deleted += toDelete.length;
    }

    if (keeper.groupKey !== targetGroupKey) {
      await prisma.notification.update({
        where: { id: keeper.id },
        data: { groupKey: targetGroupKey },
      });
      updated++;
    }
  }

  console.log(`\n   Filas leídas: ${rows.length}`);
  console.log(`   Grupos: ${groups.size} (${groupsProcessed} procesados, ${groupsSkipped} ya OK)`);
  console.log(`   Sin actor en data: ${skippedNoActor}`);
  if (!DRY_RUN) {
    console.log(`   groupKey asignados: ${updated}`);
    console.log(`   Duplicados eliminados: ${deleted}`);
  } else {
    console.log('   (dry-run, no se escribió)');
  }
}

async function backfillFriendRequestDigest(): Promise<void> {
  console.log('\n👥 friend_request → digest/individuales (sync desde Friend pendientes)\n');

  const [pendingRecipients, notificationUsers] = await Promise.all([
    prisma.friend.findMany({
      where: { status: 'pending' },
      distinct: ['friendId'],
      select: { friendId: true },
    }),
    prisma.notification.findMany({
      where: { type: 'friend_request' },
      distinct: ['userId'],
      select: { userId: true },
    }),
  ]);

  const userIds = new Set([
    ...pendingRecipients.map((r) => r.friendId),
    ...notificationUsers.map((u) => u.userId),
  ]);

  console.log(`   Usuarios a sincronizar: ${userIds.size}`);
  if (DRY_RUN || userIds.size === 0) return;

  const service = new NotificationsService();
  for (const userId of userIds) {
    await service.syncFriendRequestNotifications({
      recipientUserId: userId,
      bump: false,
    });
  }

  const remaining = await prisma.notification.count({ where: { type: 'friend_request' } });
  console.log(`   Sincronizados: ${userIds.size}`);
  console.log(`   friend_request restantes: ${remaining}`);
}

async function backfillEventReminderTypes(): Promise<void> {
  console.log('\n📅 EVENT_REMINDER → event_reminder + groupKey\n');

  const rows = await prisma.notification.findMany({
    where: { type: 'EVENT_REMINDER' },
    select: { id: true, userId: true, data: true },
  });

  console.log(`   Filas legacy: ${rows.length}`);
  if (DRY_RUN || rows.length === 0) return;

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const data = row.data as { eventId?: string; daysUntilEvent?: number } | null;
    const eventId = data?.eventId;
    const daysUntilEvent = data?.daysUntilEvent;
    const groupKey =
      typeof eventId === 'string' && typeof daysUntilEvent === 'number'
        ? `event_reminder:${eventId}:${daysUntilEvent}`
        : null;

    if (groupKey) {
      const conflict = await prisma.notification.findUnique({
        where: {
          userId_groupKey: { userId: row.userId, groupKey },
        },
        select: { id: true },
      });
      if (conflict && conflict.id !== row.id) {
        await prisma.notification.delete({ where: { id: row.id } });
        skipped++;
        continue;
      }
    }

    await prisma.notification.update({
      where: { id: row.id },
      data: {
        type: 'event_reminder',
        ...(groupKey ? { groupKey } : {}),
      },
    });
    updated++;
  }

  console.log(`   Actualizadas: ${updated}`);
  if (skipped > 0) console.log(`   Duplicados legacy eliminados: ${skipped}`);
}

async function pruneStaleFriendRequestNotificationsBackfill(): Promise<void> {
  console.log('\n🧹 Limpieza friend_request ya resueltas\n');
  const service = new NotificationsService();
  const users = await prisma.notification.findMany({
    where: { type: 'friend_request' },
    distinct: ['userId'],
    select: { userId: true },
  });

  for (const { userId } of users) {
    await service.pruneStaleFriendRequestNotifications(userId);
  }

  const remaining = await prisma.notification.count({ where: { type: 'friend_request' } });
  console.log(`   Usuarios revisados: ${users.length}`);
  console.log(`   friend_request restantes: ${remaining}`);
}

async function main(): Promise<void> {
  const scope = parseScope();
  console.log(
    `🔧 Backfill notificaciones agrupadas ${DRY_RUN ? '(DRY-RUN)' : '(APLICANDO)'} — scope=${scope}`
  );

  try {
    if (scope === 'all' || scope === 'orders') {
      await backfillOrderNotifications();
    }
    if (scope === 'all' || scope === 'posts') {
      await backfillPostNotifications();
    }
    if (scope === 'all' || scope === 'support') {
      await backfillSupportNotifications();
    }
    if (scope === 'all' || scope === 'social') {
      await backfillSocialNotifications();
    }
    if (scope === 'all' || scope === 'events') {
      await backfillEventReminderTypes();
    }
    console.log('\n✅ Backfill completado.\n');
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();

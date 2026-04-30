import { prisma } from '../../config/database';
import { env } from '../../config/env';

/* eslint-disable @typescript-eslint/no-require-imports */
const { getGiftReceivedTemplate } = require('../../email/templates/gift-received.template.js');
const { sendEmail } = require('../../email/email.service.js');



function normalizeProductImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${cdnBase}/${cleanPath}`;
}

function normalizeUserImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const base = env.S3_FILE_URL.replace(/\/$/, '');
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${base}/${cleanPath}`;
}

function emailAssetsBase(): string {
  const override = process.env.EMAIL_ASSET_BASE_URL?.trim();
  if (override) return override.replace(/\/$/, '');
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/email`;
}

/** Avatar genérico del remitente en correo (PNG en tanku-front/public/email). */
function defaultGiftSenderAvatarIconUrl(): string {
  return `${emailAssetsBase()}/tanku-email-icon-user.png`;
}

function senderDisplayName(u: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string {
  const fn = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  if (fn) return fn;
  if (u.username) return `@${u.username}`;
  return 'Alguien en Tanku';
}

/**
 * Correo “tienes un regalo” al destinatario tras pago aprobado (webhook Epayco).
 * No lanza si faltan credenciales SMTP o datos; registra errores.
 */
export async function sendGiftReceivedEmailAfterPayment(orderId: string): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[gift-email] EMAIL_USER / EMAIL_PASS no configurados — se omite envío.');
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      isGiftOrder: true,
      giftRecipientId: true,
      giftSenderId: true,
      items: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: {
          quantity: true,
          finalPrice: true,
          price: true,
          product: {
            select: {
              title: true,
              images: true,
            },
          },
          variant: {
            select: { title: true },
          },
        },
      },
    },
  });

  if (!order?.isGiftOrder || !order.giftRecipientId || !order.giftSenderId) return;

  const recipient = await prisma.user.findUnique({
    where: { id: order.giftRecipientId },
    select: { email: true },
  });
  if (!recipient?.email) {
    console.warn(`[gift-email] Destinatario sin email: ${order.giftRecipientId}`);
    return;
  }

  const sender = await prisma.user.findUnique({
    where: { id: order.giftSenderId },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      profile: { select: { avatar: true } },
    },
  });
  if (!sender) return;

  const primary = order.items[0];
  if (!primary) {
    console.warn(`[gift-email] Orden ${orderId} sin items`);
    return;
  }

  const rawImg = primary.product.images?.[0];
  const productImageUrl =
    normalizeProductImageUrl(rawImg) || `${emailAssetsBase()}/tanku-email-product-fallback.png`;
  const avatarRaw = sender.profile?.avatar;
  let senderAvatarUrl = normalizeUserImageUrl(avatarRaw);
  if (!senderAvatarUrl) senderAvatarUrl = defaultGiftSenderAvatarIconUrl();

  const qty = primary.quantity || 1;
  let title = primary.product.title;
  if (primary.variant?.title) {
    title = `${primary.product.title} — ${primary.variant.title}`;
  }
  if (qty > 1) title = `${title} (×${qty})`;

  const name = senderDisplayName(sender);
  const messageBody =
    '¡Esperamos que te guste! Fue elegido pensando en ti. Entra a Mis Tankus para ver todos los detalles.';

  const frontendBase = env.FRONTEND_URL.replace(/\/$/, '');
  const ctaUrl = `${frontendBase}/profile?tab=MIS_TANKUS`;

  const assetBaseToUse = emailAssetsBase();

  try {
    const fb = new URL(env.FRONTEND_URL.startsWith('http') ? env.FRONTEND_URL : `https://${env.FRONTEND_URL}`);
    const h = fb.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1') {
      console.warn(
        `[gift-email] FRONTEND_URL es ${env.FRONTEND_URL}: las imágenes del correo usan ${assetBaseToUse} — Gmail no cargará localhost. Usá HTTPS público en producción.`
      );
    }
  } catch {
    /* noop */
  }

  const { html, text } = getGiftReceivedTemplate({
    senderDisplayName: name,
    senderAvatarUrl,
    productTitle: title,
    productImageUrl,
    productSubtitle: 'PRODUCTO',
    messageBody,
    ctaUrl,
    assetBase: assetBaseToUse,
  });

  try {
    await sendEmail({
      to: recipient.email,
      subject: `¡${name} te envió un regalo en Tanku!`,
      html,
      text,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[gift-email] Envío fallido:', msg);
  }
}

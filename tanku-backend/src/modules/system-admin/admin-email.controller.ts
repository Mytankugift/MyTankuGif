import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../shared/errors/AppError';
import { successResponse } from '../../shared/response';

/* eslint-disable @typescript-eslint/no-require-imports */
const { getGiftReceivedTemplate } = require('../../email/templates/gift-received.template.js');
const { sendEmail } = require('../../email/email.service.js');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isLoopbackImageUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return true;
    if (h.endsWith('.local')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Gmail y otros clients descargan imágenes desde internet; localhost nunca es visible.
 */
function assertPublicImageUrls(urls: Iterable<string>): void {
  for (const raw of urls) {
    if (!raw || typeof raw !== 'string') continue;
    const u = raw.trim();
    if (!u) continue;
    if (isLoopbackImageUrl(u)) {
      throw new BadRequestError(
        `URL no válida para correo: "${u}". No uses localhost ni 127.0.0.1: el servidor de Gmail no puede abrir tu máquina local. ` +
          `Configurá la URL pública HTTPS donde está desplegado tanku-front (p. ej. https://www.mytanku.com/email/…).`
      );
    }
  }
}

const DEFAULT_PUBLIC_EMAIL_BASE = 'https://www.mytanku.com/email';

function emailAssetUrl(baseRaw: string, fileName: string): string {
  const base = baseRaw.replace(/\/$/, '');
  return `${base}/${fileName}`;
}

/** Assets = nombres en tanku-front/public/email */
function defaultMytankuAssetUrls(assetBase = DEFAULT_PUBLIC_EMAIL_BASE) {
  const b = assetBase.replace(/\/$/, '');
  return {
    mark: emailAssetUrl(b, 'tanku-email-mark.png'),
    giftBadge: emailAssetUrl(b, 'tanku-email-gift-badge.png'),
    iconLock: emailAssetUrl(b, 'tanku-email-icon-lock.png'),
    iconHeart: emailAssetUrl(b, 'tanku-email-icon-heart-hand.png'),
    iconHome: emailAssetUrl(b, 'tanku-email-icon-home.png'),
    iconUnique: emailAssetUrl(b, 'tanku-email-icon-unique.png'),
  };
}

/** Campos esperados por getGiftReceivedTemplate (plantilla correo regalo). */
interface GiftTemplatePayload {
  senderDisplayName: string;
  senderAvatarUrl: string;
  productTitle: string;
  productImageUrl: string;
  productPriceLabel: string;
  productSubtitle?: string;
  messageBody: string;
  ctaUrl: string;
  assetBase: string;
  assetUrls?: Record<string, string>;
}

/**
 * Interpreta body del ERP (los mismos campos que POST gift-preview menos `to` obligatorio en envío).
 */
function resolveGiftPreviewTemplatePayload(bodyRaw: unknown): GiftTemplatePayload {
  const body = (bodyRaw && typeof bodyRaw === 'object' ? bodyRaw : {}) as Record<string, unknown>;

  const assetBase =
    typeof body.assetBase === 'string' && body.assetBase.trim()
      ? body.assetBase.trim().replace(/\/$/, '')
      : DEFAULT_PUBLIC_EMAIL_BASE;

  const senderDisplayName =
    typeof body.senderDisplayName === 'string' && body.senderDisplayName.trim()
      ? body.senderDisplayName.trim()
      : 'Danna';

  const senderAvatarUrl =
    typeof body.senderAvatarUrl === 'string' && body.senderAvatarUrl.trim()
      ? body.senderAvatarUrl.trim()
      : emailAssetUrl(assetBase, 'tanku-email-icon-user.png');

  const productTitle =
    typeof body.productTitle === 'string' && body.productTitle.trim()
      ? body.productTitle.trim()
      : 'Tenis Nike Retro';

  const productImageUrl =
    typeof body.productImageUrl === 'string' && body.productImageUrl.trim()
      ? body.productImageUrl.trim()
      : emailAssetUrl(assetBase, 'tennis.png');

  const productPriceLabel =
    typeof body.productPriceLabel === 'string' && body.productPriceLabel.trim()
      ? body.productPriceLabel.trim()
      : '$200.000';

  const messageBody =
    typeof body.messageBody === 'string' && body.messageBody.trim()
      ? body.messageBody.trim()
      : 'Espero que te gusten, los elegí pensando en ti. ¡Disfrútalos!';

  const ctaUrl =
    typeof body.ctaUrl === 'string' && body.ctaUrl.trim()
      ? body.ctaUrl.trim()
      : 'https://www.mytanku.com/profile?tab=MIS_TANKUS';

  const defaults = defaultMytankuAssetUrls(assetBase);
  const custom =
    typeof body.assetUrls === 'object' && body.assetUrls !== null
      ? (body.assetUrls as Record<string, string>)
      : {};
  const merged: Record<string, string> = { ...defaults };
  for (const [k, v] of Object.entries(custom)) {
    if (typeof v === 'string' && v.trim()) merged[k] = v.trim();
  }

  return {
    senderDisplayName,
    senderAvatarUrl,
    productTitle,
    productImageUrl,
    productPriceLabel,
    productSubtitle: 'PRODUCTO',
    messageBody,
    ctaUrl,
    assetBase,
    assetUrls: merged,
  };
}

export class AdminEmailController {
  /**
   * POST /api/v1/admin/system/email/gift-preview/render
   * Misma entrada que gift-preview menos `to`. Devuelve HTML para abrir en el navegador (no envía correo).
   * No valida loopback: en tu PC sí podés cargar http://localhost/... en la pestaña previa.
   */
  postGiftPreviewRender = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = resolveGiftPreviewTemplatePayload(req.body);
      const { html, text } = getGiftReceivedTemplate(payload);
      res.status(200).json(successResponse({ html, text }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/system/email/gift-preview
   * Envía correo de prueba; exige SMTP y URLs públicas (sin localhost).
   */
  postGiftPreview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new BadRequestError(
          'EMAIL_USER / EMAIL_PASS no están configurados en el backend; no se puede enviar.'
        );
      }

      const body = req.body || {};
      const toRaw = typeof body.to === 'string' ? body.to.trim() : '';
      if (!toRaw || !EMAIL_RE.test(toRaw)) {
        throw new BadRequestError('to es obligatorio y debe ser un correo válido');
      }

      const payload = resolveGiftPreviewTemplatePayload(body);

      assertPublicImageUrls([
        payload.assetBase,
        payload.senderAvatarUrl,
        payload.productImageUrl,
        ...Object.values(payload.assetUrls || {}),
      ]);

      const { html, text } = getGiftReceivedTemplate(payload);

      await sendEmail({
        to: toRaw,
        subject: `[Prueba ERP] ${payload.senderDisplayName} te envió un regalo (demo)`,
        html,
        text,
      });

      res.status(200).json({
        success: true,
        data: {
          message: `Plantilla de regalo enviada a ${toRaw}`,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

const { escapeHtml } = require('./base.template');

/**
 * HTML transaccional: regalo Tanku tras pago confirmado.
 * Imagenes estaticas: `${assetBase}/…` (ver tanku-front/public/email/README.md).
 *
 * @param {{
 *   senderDisplayName: string,
 *   senderAvatarUrl: string,
 *   productTitle: string,
 *   productImageUrl: string,
 *   productSubtitle?: string,
 *   messageBody: string,
 *   ctaUrl: string,
 *   assetBase: string,
 *   assetUrls?: Partial<{
 *     mark: string,
 *     giftBadge: string,
 *     iconLock: string,
 *     iconHeart: string,
 *     iconHome: string,
 *     iconUnique: string,
 *   }>,
 * }} p
 * @returns {{ html: string, text: string }}
 */
function resolveEmailAsset(assetBase, defaultFile, overrides, key) {
  const o = overrides && typeof overrides === 'object' ? overrides[key] : undefined;
  if (typeof o === 'string' && o.trim()) return o.trim();
  return `${assetBase}/${defaultFile}`;
}

function getGiftReceivedTemplate(p) {
  const assetBase = p.assetBase.replace(/\/$/, '');
  const u = p.assetUrls || {};
  const mark = resolveEmailAsset(assetBase, 'tanku-email-mark.png', u, 'mark');
  const giftBadge = resolveEmailAsset(assetBase, 'tanku-email-gift-badge.png', u, 'giftBadge');
  const iconLock = resolveEmailAsset(assetBase, 'tanku-email-icon-lock.png', u, 'iconLock');
  const iconHeart = resolveEmailAsset(assetBase, 'tanku-email-icon-heart-hand.png', u, 'iconHeart');
  const iconHome = resolveEmailAsset(assetBase, 'tanku-email-icon-home.png', u, 'iconHome');
  const iconUnique = resolveEmailAsset(assetBase, 'tanku-email-icon-unique.png', u, 'iconUnique');

  const sender = escapeHtml(p.senderDisplayName);
  const titleName = sender;
  const productTitle = escapeHtml(p.productTitle);
  const subtitle = escapeHtml(p.productSubtitle || 'Producto');
  const message = escapeHtml(p.messageBody);
  const signoff = sender;
  const cta = escapeHtml(p.ctaUrl);
  const avatarUrl = escapeHtml(p.senderAvatarUrl);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Tienes un regalo</title>
</head>
<body style="margin:0;padding:0;background:#070b14;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#070b14;">
    <tr>
      <td align="center" style="padding:16px 12px;">
        <!-- Tarjeta más compacta (≈ postcard) -->
        <table width="480" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:480px;width:100%;font-family:Arial,Helvetica,sans-serif;color:#e6ecff;border-radius:16px;overflow:hidden;background-color:#0b1220;border:1px solid #1a2338;">

          <tr>
            <td style="padding:12px 16px 12px;border-bottom:1px solid #1a2338;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="86" valign="middle" style="vertical-align:middle;padding-right:6px;">
                    <!-- Mark; círculo #6ef2a6 (más ajustado al icono) -->
                    <div style="display:inline-block;width:72px;line-height:0;margin-top:0;text-align:center;">
                      <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                        <tr>
                          <td align="center" valign="middle" style="background-color:#6ef2a6;border-radius:50%;width:26px;height:26px;line-height:26px;mso-padding-alt:0;">
                            <img src="${escapeHtml(mark)}" width="52" height="52" alt="Tanku"
                              style="display:inline-block;width:68px;height:68px;object-fit:contain;vertical-align:middle;-ms-interpolation-mode:bicubic;">
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                  <td style="padding-left:6px;padding-top:4px;" valign="middle">
                    <div style="color:#6ef2a6;font-size:17px;font-weight:bold;line-height:1.15;letter-spacing:0.03em;">TANKU</div>
                    <div style="font-size:11px;color:#8fa3c7;line-height:1.25;margin-top:3px;font-weight:normal;">Give-Commerce</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 16px 8px;">
              <!-- Avatar + icono regalo superpuesto (esquina inferior derecha) -->
              <div style="display:inline-block;position:relative;width:100px;height:100px;line-height:0;">
                <img src="${avatarUrl}" width="100" height="100" alt=""
                  style="display:block;width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid #1f2a44;">
                <div style="position:absolute;right:-6px;bottom:-6px;width:42px;height:42px;line-height:0;text-align:right;">
                  <img src="${escapeHtml(giftBadge)}" width="42" height="42" alt=""
                    style="display:block;width:42px;height:42px;border-radius:50%;border:2px solid #0b1220;box-sizing:border-box;">
                </div>
              </div>

              <h1 style="margin:16px 0 8px;font-size:23px;line-height:1.2;font-weight:bold;">
                ¡<span style="color:#ffffff;">${titleName}</span> te<br>
                <span style="color:#6ef2a6;">regaló algo especial!</span>
              </h1>

              <p style="color:#a8b6d9;font-size:13px;max-width:360px;margin:0 auto;line-height:1.45;">
                Alguien pensó en ti y quiere que disfrutes este producto increíble.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 16px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#0f1a2b;border-radius:14px;border:1px solid #223154;overflow:hidden;">
                <tr>
                  <td width="42%" valign="middle" style="padding:14px 10px 14px 14px;">
                    <img src="${escapeHtml(p.productImageUrl)}" width="152" alt=""
                      style="display:block;width:100%;max-width:152px;height:auto;border-radius:12px;margin:0 auto;border:1px solid #273a56;box-sizing:border-box;">
                  </td>
                  <td width="58%" valign="middle" style="padding:14px 14px 14px 6px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td valign="top" style="padding:0;border-left:3px solid #6ef2a6;padding-left:12px;">
                          <div style="margin-bottom:10px;">
                            <span style="display:inline-block;background-color:#07121f;border:1px solid #1e3048;border-radius:20px;padding:5px 10px;">
                              <span style="color:#6ef2a6;font-size:10px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;">${subtitle}</span>
                            </span>
                          </div>
                          <div style="color:#f0f4ff;font-size:18px;font-weight:700;line-height:1.3;margin:0;letter-spacing:-0.02em;">
                            ${productTitle}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 16px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#0f1a2b;border-radius:14px;border:1px solid #1f2a44;">
                <tr>
                  <td valign="top" width="34" style="padding:14px 0 14px 14px;color:#6ef2a6;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:0.85;">&#8220;</td>
                  <td valign="middle" style="padding:14px 8px 10px;font-size:14px;line-height:1.55;color:#cfd8ee;font-style:italic;">
                    ${message}
                  </td>
                  <td valign="bottom" width="34" align="right" style="padding:0 14px 18px 0;color:#6ef2a6;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:0.85;">&#8221;</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding:0 16px 14px;font-size:13px;color:#6ef2a6;text-align:right;">
                    &#8212; ${signoff}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:4px 16px 18px;">
              <a href="${cta}"
                style="display:inline-block;padding:12px 28px;background:#5ee8a8;color:#04271e;border-radius:999px;font-weight:bold;text-decoration:none;font-size:15px;border:1px solid #4dd89a;box-shadow:inset 0 2px 0 rgba(255,255,255,0.45),inset 0 -4px 10px rgba(4,52,44,0.38),inset 0 -1px 0 rgba(4,39,34,0.35);">
                Ver mi regalo &#8594;
              </a>
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #1a2338;padding:14px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:11px;color:#8fa3c7;">
                <tr>
                  <td width="25%" align="center" valign="top" style="padding:10px 8px;line-height:1.35;font-weight:normal;">
                    <img src="${escapeHtml(iconLock)}" width="28" height="36" alt="" style="display:block;margin:0 auto 8px;width:28px;height:36px;max-width:28px;object-fit:contain;"><span style="display:block;padding:0 2px;">Seguro</span>
                  </td>
                  <td width="25%" align="center" valign="top" style="padding:10px 8px;line-height:1.35;">
                    <img src="${escapeHtml(iconHeart)}" width="28" height="28" alt="" style="display:block;margin:0 auto 8px;width:28px;height:28px;max-width:28px;object-fit:contain;"><span style="display:block;padding:0 2px;">Confiable</span>
                  </td>
                  <td width="25%" align="center" valign="top" style="padding:10px 8px;line-height:1.35;">
                    <img src="${escapeHtml(iconHome)}" width="28" height="28" alt="" style="display:block;margin:0 auto 8px;width:28px;height:28px;max-width:28px;object-fit:contain;"><span style="display:block;padding:0 2px;">Especial</span>
                  </td>
                  <td width="25%" align="center" valign="top" style="padding:10px 8px;line-height:1.35;">
                    <img src="${escapeHtml(iconUnique)}" width="28" height="28" alt="" style="display:block;margin:0 auto 8px;width:28px;height:28px;max-width:28px;object-fit:contain;"><span style="display:block;padding:0 2px;">Único</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:12px 16px 14px;font-size:11px;color:#6c7ea6;">
              Gracias por ser parte de <span style="color:#6ef2a6;">TANKU</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `¡${p.senderDisplayName} te regaló algo especial en Tanku!`,
    '',
    `\u201C${p.messageBody}\u201D`,
    `– ${p.senderDisplayName}`,
    '',
    `Producto: ${p.productTitle}`,
    '',
    `Ver tu regalo: ${p.ctaUrl}`,
  ].join('\n');

  return { html, text };
}

module.exports = { getGiftReceivedTemplate };

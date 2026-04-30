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
 *   productPriceLabel: string,
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
  const price = escapeHtml(p.productPriceLabel);
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
      <td align="center" style="padding:20px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:600px;font-family:Arial,Helvetica,sans-serif;color:#e6ecff;border-radius:20px;overflow:hidden;background-color:#0b1220;border:1px solid #1a2338;">

          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #1a2338;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="44" valign="middle">
                    <img src="${escapeHtml(mark)}" width="36" height="36" alt="Tanku"
                      style="display:block;width:36px;height:36px;border-radius:50%;object-fit:cover;">
                  </td>
                  <td style="padding-left:10px;" valign="middle">
                    <div style="color:#6ef2a6;font-size:18px;font-weight:bold;">TANKU</div>
                    <div style="font-size:12px;color:#8fa3c7;">Give-Commerce</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:30px 20px 10px;">
              <table cellpadding="0" cellspacing="0" role="presentation" align="center">
                <tr>
                  <td align="center" style="vertical-align:middle;">
                    <img src="${avatarUrl}" width="110" height="110" alt=""
                      style="display:block;border-radius:50%;width:110px;height:110px;object-fit:cover;">
                  </td>
                  <td width="8"></td>
                  <td valign="bottom" style="vertical-align:bottom;padding-bottom:4px;">
                    <img src="${escapeHtml(giftBadge)}" width="40" height="40" alt=""
                      style="display:block;width:40px;height:40px;">
                  </td>
                </tr>
              </table>

              <h1 style="margin:20px 0 10px;font-size:28px;line-height:1.25;font-weight:bold;">
                ¡<span style="color:#ffffff;">${titleName}</span> te<br>
                <span style="color:#6ef2a6;">regaló algo especial!</span>
              </h1>

              <p style="color:#a8b6d9;font-size:14px;max-width:400px;margin:0 auto;line-height:1.5;">
                Alguien pensó en ti y quiere que disfrutes este producto increíble.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#0f1a2b;border-radius:16px;border:1px solid #1f2a44;">
                <tr>
                  <td width="50%" style="padding:16px;">
                    <img src="${escapeHtml(p.productImageUrl)}" width="260" alt=""
                      style="display:block;width:100%;max-width:260px;height:auto;border-radius:12px;">
                  </td>
                  <td width="50%" style="padding:16px;vertical-align:top;">
                    <div style="color:#6ef2a6;font-size:12px;margin-bottom:6px;">${subtitle}</div>
                    <div style="font-size:20px;font-weight:bold;margin-bottom:6px;line-height:1.3;">
                      ${productTitle}
                    </div>
                    <div style="color:#6ef2a6;font-size:18px;font-weight:bold;">
                      ${price}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 20px;">
              <div style="background:#0f1a2b;padding:16px;border-radius:14px;border:1px solid #1f2a44;">
                <div style="color:#6ef2a6;font-size:36px;line-height:1;">“</div>
                <p style="margin:4px 0 12px;font-size:14px;line-height:1.55;color:#e6ecff;">
                  ${message}
                </p>
                <div style="color:#6ef2a6;font-size:14px;">– ${signoff}</div>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:10px 20px 30px;">
              <a href="${cta}"
                style="display:inline-block;padding:14px 28px;background:#6ef2a6;color:#062312;border-radius:999px;font-weight:bold;text-decoration:none;font-size:16px;">
                Ver mi regalo →
              </a>
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #1a2338;padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="text-align:center;font-size:12px;color:#8fa3c7;">
                <tr>
                  <td style="width:25%;"><img src="${escapeHtml(iconLock)}" width="20" height="20" alt="" style="display:inline-block;"><br>Seguro</td>
                  <td style="width:25%;"><img src="${escapeHtml(iconHeart)}" width="20" height="20" alt="" style="display:inline-block;"><br>Confiable</td>
                  <td style="width:25%;"><img src="${escapeHtml(iconHome)}" width="20" height="20" alt="" style="display:inline-block;"><br>Especial</td>
                  <td style="width:25%;"><img src="${escapeHtml(iconUnique)}" width="20" height="20" alt="" style="display:inline-block;"><br>Único</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px;font-size:12px;color:#6c7ea6;">
              Gracias por ser parte de <span style="color:#6ef2a6;">TANKU</span>
              <br><br>
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
    p.messageBody,
    `– ${p.senderDisplayName}`,
    '',
    `Producto: ${p.productTitle}`,
    `Precio: ${p.productPriceLabel}`,
    '',
    `Ver tu regalo: ${p.ctaUrl}`,
  ].join('\n');

  return { html, text };
}

module.exports = { getGiftReceivedTemplate };

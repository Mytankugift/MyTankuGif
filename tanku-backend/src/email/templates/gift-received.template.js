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
  <!-- Diseño claro por defecto: reduce inversiones fuertes en modo oscuro de algunos clientes de correo. -->
  <meta name="color-scheme" content="light">
  <title>Tienes un regalo</title>
</head>
<body bgcolor="#edf2f7" style="margin:0;padding:0;background-color:#edf2f7;color:#334155;">
  <table width="100%" bgcolor="#edf2f7" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#edf2f7;mso-cellspacing:0;">
    <tr>
      <td align="center" style="padding:16px 12px;">
        <!-- Tarjeta más compacta (≈ postcard) -->
        <table width="480" bgcolor="#ffffff" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:480px;width:100%;font-family:Arial,Helvetica,sans-serif;color:#334155;border-radius:16px;overflow:hidden;background-color:#ffffff;border:1px solid #e2e8f0;mso-cellspacing:0;">

          <tr>
            <td bgcolor="#ffffff" style="padding:12px 16px 12px;border-bottom:1px solid #e8ecf1;background-color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="86" valign="middle" style="vertical-align:middle;padding-right:6px;">
                    <!-- Mark: mismo tamaño círculo e imagen declarados para evitar glitches entre clients -->
                    <div style="display:inline-block;width:72px;line-height:0;margin-top:0;text-align:center;">
                      <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;border-collapse:collapse;">
                        <tr>
                          <td align="center" valign="middle" bgcolor="#6ef2a6" height="72" width="72"
                            style="background-color:#6ef2a6;border-radius:36px;line-height:72px;mso-padding-alt:0;text-align:center;">
                            <img src="${escapeHtml(mark)}" width="62" height="62" alt="Tanku"
                              style="display:inline-block;width:62px;height:62px;object-fit:contain;vertical-align:middle;-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;">
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                  <td style="padding-left:6px;padding-top:4px;" valign="middle">
                    <div style="color:#0f766e;font-size:17px;font-weight:bold;line-height:1.15;letter-spacing:0.03em;">TANKU</div>
                    <div style="font-size:11px;color:#64748b;line-height:1.25;margin-top:3px;font-weight:normal;">Give-Commerce</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" bgcolor="#ffffff" style="padding:20px 16px 8px;background-color:#ffffff;">
              <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:0 auto;border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:0 0 4px;line-height:0;mso-padding-alt:0;">
                    <img src="${avatarUrl}" width="100" height="100" alt=""
                      style="display:block;width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;box-sizing:content-box;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 0;line-height:0;mso-padding-alt:0;">
                    <table cellpadding="0" cellspacing="0" bgcolor="#e8edf3" role="presentation" align="center"
                      style="margin:0 auto;background-color:#e8edf3;border-radius:999px;border-collapse:separate;mso-cellspacing:0;line-height:0;">
                      <tr>
                        <td align="center" valign="middle" style="padding:6px;line-height:0;mso-padding-alt:6px;">
                          <img src="${escapeHtml(giftBadge)}" width="36" height="36" alt="Regalo"
                            style="display:block;width:36px;height:36px;border:0;outline:none;border-radius:50%;box-sizing:border-box;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h1 style="margin:12px 0 8px;font-size:23px;line-height:1.2;font-weight:bold;color:#0f172a;">
                ¡<span style="color:#0f172a;">${titleName}</span> te<br>
                <span style="color:#0d9f5c;">regaló algo especial!</span>
              </h1>

              <p style="color:#64748b;font-size:13px;max-width:360px;margin:0 auto;line-height:1.45;">
                Alguien pensó en ti y quiere que disfrutes este producto increíble.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 16px 14px;">
              <table width="100%" bgcolor="#fafbfc" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#fafbfc;border-radius:14px;border:1px solid #e2e8f0;border-collapse:separate;mso-cellspacing:0;">
                <tr>
                  <td width="42%" valign="top" style="padding:14px 10px 14px 14px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center"
                      style="max-width:152px;width:100%;margin:0 auto;border-collapse:collapse;">
                      <tr>
                        <td align="center" style="padding:0;line-height:0;mso-padding-alt:0;">
                          <div style="display:inline-block;max-width:152px;width:100%;line-height:0;">
                            <img src="${escapeHtml(p.productImageUrl)}" width="152" alt=""
                              style="display:block;width:100%;max-width:152px;height:auto;border-radius:12px;margin:0;border:1px solid #e2e8f0;box-sizing:border-box;vertical-align:top;background-color:#ffffff;">
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="58%" valign="middle" bgcolor="#fafbfc" style="padding:14px 14px 14px 6px;background-color:#fafbfc;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                      <tr>
                        <td valign="middle" bgcolor="#fafbfc"
                          style="padding:0;border-left:3px solid #34d399;padding-left:12px;mso-padding-left:12px;background-color:#fafbfc;">
                          <div style="margin-bottom:10px;">
                            <span style="display:inline-block;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:5px 10px;line-height:1.2;">
                              <span style="color:#047857;font-size:10px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;">${subtitle}</span>
                            </span>
                          </div>
                          <div style="color:#0f172a;font-size:18px;font-weight:700;line-height:1.3;margin:0;letter-spacing:-0.02em;">
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
              <table width="100%" bgcolor="#fafbfc" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#fafbfc;border-radius:14px;border:1px solid #e2e8f0;">
                <tr>
                  <td valign="top" width="34" style="padding:14px 0 14px 14px;color:#0d9f5c;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:0.85;">&#8220;</td>
                  <td valign="middle" style="padding:14px 8px 10px;font-size:14px;line-height:1.55;color:#475569;font-style:italic;">
                    ${message}
                  </td>
                  <td valign="bottom" width="34" align="right" style="padding:0 14px 18px 0;color:#0d9f5c;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:0.85;">&#8221;</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding:0 16px 14px;font-size:13px;color:#0f766e;text-align:right;font-style:normal;">
                    &#8212; ${signoff}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:4px 16px 18px;">
              <a href="${cta}"
                style="display:inline-block;padding:12px 28px;background:#34d399;color:#065f46;border-radius:999px;font-weight:bold;text-decoration:none;font-size:15px;border:1px solid #10b981;">
                Ver mi regalo &#8594;
              </a>
            </td>
          </tr>

          <tr>
            <td bgcolor="#fafafa" style="border-top:1px solid #e8ecf1;padding:14px 8px;background-color:#fafafa;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:11px;color:#64748b;">
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
            <td align="center" bgcolor="#ffffff" style="padding:12px 16px 14px;font-size:11px;color:#94a3b8;background-color:#ffffff;">
              Gracias por ser parte de <span style="color:#0f766e;">TANKU</span>
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

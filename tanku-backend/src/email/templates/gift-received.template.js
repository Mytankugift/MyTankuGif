const { escapeHtml } = require('./base.template');

const MAX_MESSAGE_HTML_NEWLINES = 32;

/** Maestro tanku-email-card.png (px). Ajustá si cambiás el arte. */
const BG_MASTER_W = 2901;
const BG_MASTER_H = 4482;
/** Ancho del correo: un poco más ancho suele verse más nítido al escalar el PNG. */
const MAIL_CARD_W = 480;

const AVATAR_BORDER = '3px solid #000000';
const IMG_RENDER = '-ms-interpolation-mode:bicubic;image-rendering:auto;';

/** Misma familia que tanku-front (globals.css / layout.tsx). Fallbacks si el cliente bloquea la webfont. */
const FONT_STACK =
  "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif";

const POPPINS_GOOGLE_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';

function messageWithBreaks(escapedPlain) {
  const parts = escapedPlain.split(/\r\n|\n|\r/);
  if (parts.length > MAX_MESSAGE_HTML_NEWLINES + 1) {
    parts.splice(MAX_MESSAGE_HTML_NEWLINES, parts.length, '…');
  }
  return parts.join('<br/>');
}

function resolveBackgroundCardUrl(assetBase, overrides) {
  const u = overrides && typeof overrides === 'object' ? overrides : {};
  const keys = ['backgroundCard', 'cardHero'];
  for (const k of keys) {
    const o = u[k];
    if (typeof o === 'string' && o.trim()) return o.trim();
  }
  return `${assetBase}/tanku-email-card.png`;
}

/**
 * Fondo único `tanku-email-card.png` (header, marcos de cards y pie ya en la imagen).
 *
 * @param {{
 *   senderDisplayName: string,
 *   senderAvatarUrl: string,
 *   recipientAvatarUrl: string,
 *   productTitle?: string,
 *   messageBody: string,
 *   ctaUrl: string,
 *   assetBase: string,
 *   assetUrls?: Partial<{ backgroundCard: string, cardHero: string }>,
 * }} p
 */
function getGiftReceivedTemplate(p) {
  const assetBase = p.assetBase.replace(/\/$/, '');
  const u = p.assetUrls || {};
  const bgUrl = resolveBackgroundCardUrl(assetBase, u);
  const bgEsc = escapeHtml(bgUrl);

  const senderAvatarEscaped = escapeHtml(p.senderAvatarUrl);
  const recipientAvatarEscaped = escapeHtml(p.recipientAvatarUrl);
  const senderName = escapeHtml(p.senderDisplayName);
  const message = messageWithBreaks(escapeHtml(p.messageBody));
  const cta = escapeHtml(p.ctaUrl);

  const accentTeal = '#66DEDB';
  const accentGreen = '#5cff9a';
  const fallbackBg = '#0a0b0f';
  /** Botón “Ver producto”: barrido horizontal (clientes sin gradiente ven `ctaBtnSolid`). */
  const ctaBtnGradLight = '#73ffa2';
  const ctaBtnGradDark = '#064e3b';
  const ctaBtnSolid = '#0d9560';

  const scale = MAIL_CARD_W / BG_MASTER_W;
  const scaledTotalH = Math.round(BG_MASTER_H * scale);

  /** Y maestro PNG: valores ↑ mueven ese bloque más abajo en el lienzo. */
  const yAvatarsMaster = 515;
  const yMainMaster = 1800;
  const yBubbleMaster = 2715;

  const spacerTopPx = Math.round(yAvatarsMaster * scale);
  const mainStartDisp = Math.round(yMainMaster * scale);
  const clusterDispH = Math.max(136, mainStartDisp - spacerTopPx);

  const bottomReservePx = Math.max(96, Math.round(420 * scale));

  const bubbleTopDisp = Math.round(yBubbleMaster * scale);
  const bubbleMinH = Math.max(
    92,
    scaledTotalH - bubbleTopDisp - bottomReservePx - 12
  );

  /** Hueco del bloque «No es solo…» + botón (fuente más grande) */
  const mainBlockApproxDisp = 150;
  const spacerMiddlePx = Math.max(
    0,
    bubbleTopDisp - spacerTopPx - clusterDispH - mainBlockApproxDisp
  );

  /** Avatars: mayor solapamiento (derecha ~24% del diámetro sobre la izquierda). */
  const avSize = 84;
  const avRad = Math.round(avSize / 2);
  const avOverlapPx = Math.max(14, Math.round(avSize * 0.24));
  const avatarClusterOuterW = avSize + avSize - avOverlapPx;

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${POPPINS_GOOGLE_STYLESHEET}" rel="stylesheet">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>Un regalo en Tanku</title>
</head>
<body bgcolor="${fallbackBg}" style="margin:0;padding:16px 0;background-color:${fallbackBg};color:#ffffff;font-family:${FONT_STACK};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${fallbackBg}" style="background-color:${fallbackBg};margin:0;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table align="center" width="${MAIL_CARD_W}" cellpadding="0" cellspacing="0" role="presentation"
          style="border-collapse:separate;mso-cellspacing:0;width:100%;max-width:${MAIL_CARD_W}px;background-color:${fallbackBg};">
          <tr>
            <td width="${MAIL_CARD_W}" valign="top" align="center" height="${scaledTotalH}"
              background="${bgEsc}"
              bgcolor="${fallbackBg}"
              style="
                padding:0 20px;
                vertical-align:top;
                height:${scaledTotalH}px;
                min-height:${scaledTotalH}px;
                background:url('${bgEsc}') center top no-repeat;
                background-size:${MAIL_CARD_W}px auto;
                background-color:${fallbackBg};
                -webkit-print-color-adjust:exact;
              ">
              <!-- Avatars + titular -->
              <table cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%" style="max-width:${MAIL_CARD_W - 40}px;margin:0 auto;">
                ${spacerTopPx ? `<tr><td height="${spacerTopPx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>` : ''}
                <tr>
                  <td align="center" valign="middle" height="${clusterDispH}" style="height:${clusterDispH}px;line-height:normal;font-family:${FONT_STACK};">
                    <table align="center" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;border-collapse:collapse;width:${avatarClusterOuterW}px;">
                      <tr>
                        <td valign="middle" align="right" width="${avSize}" style="padding:0;line-height:0;">
                          <img src="${senderAvatarEscaped}" width="${avSize}" height="${avSize}" alt=""
                            style="display:block;width:${avSize}px;height:${avSize}px;border-radius:${avRad}px;object-fit:cover;border:${AVATAR_BORDER};box-sizing:border-box;${IMG_RENDER}">
                        </td>
                        <td valign="middle" align="left" width="${avSize - avOverlapPx}" style="padding:0;line-height:0;">
                          <img src="${recipientAvatarEscaped}" width="${avSize}" height="${avSize}" alt=""
                            style="display:block;margin-left:-${avOverlapPx}px;width:${avSize}px;height:${avSize}px;border-radius:${avRad}px;object-fit:cover;border:${AVATAR_BORDER};box-sizing:border-box;${IMG_RENDER}">
                        </td>
                      </tr>
                    </table>
                    <p style="margin:14px 8px 0;color:#ffffff;font-size:24px;line-height:1.28;font-weight:700;text-align:center;letter-spacing:0.02em;">
                      <span style="color:${accentTeal};">¡${senderName}</span>
                      <span style="color:${accentGreen};"> te<br>regaló algo especial!</span>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Primera card: solo texto fijo + CTA dentro del hueco del PNG -->
              <table cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%" style="max-width:${MAIL_CARD_W - 52}px;margin:0 auto;">
                <tr>
                  <td align="center" style="padding:54px 24px 10px;font-family:${FONT_STACK};">
                    <p style="margin:0 0 16px;color:#ffffff;font-size:19px;line-height:1.5;font-weight:600;text-align:center;letter-spacing:0.025em;font-style:normal;">
                      No es solo un regalo, es una forma de decirte cuánto importas.
                    </p>
                    <table cellpadding="0" cellspacing="0" align="center" role="presentation" style="margin:0 auto;">
                      <tr>
                        <td align="center" bgcolor="${ctaBtnSolid}" style="
                            border-radius:999px;
                            background-color:${ctaBtnSolid};
                            background-image:linear-gradient(90deg,${ctaBtnGradLight} 0%,${ctaBtnGradDark} 100%);
                            box-shadow:inset 0 2px 5px rgba(0,0,0,0.45),inset 0 -2px 4px rgba(0,0,0,0.28);
                          ">
                          <a href="${cta}"
                            style="display:inline-block;padding:10px 40px;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:1.15;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.03em;box-shadow:inset 0 2px 4px rgba(0,0,0,0.45),inset 0 -2px 3px rgba(0,0,0,0.25);">
                            Ver producto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${spacerMiddlePx ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td height="${spacerMiddlePx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr></table>` : ''}

              <!-- Mensaje contenido dentro de la burbuja (ancho limitado para no desbordar el arte) -->
              <table cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%"
                style="max-width:${MAIL_CARD_W - 52}px;margin:0 auto;">
                <tr>
                  <td align="center" valign="top" height="${bubbleMinH}"
                    style="
                      min-height:${bubbleMinH}px;
                      vertical-align:top;
                      padding:38px 34px 16px;
                      font-family:${FONT_STACK};
                      font-size:17px;
                      line-height:1.58;
                      color:#fdfcff;
                      text-align:center;
                      letter-spacing:0.02em;
                      font-weight:500;
                    ">
                    <table align="center" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;max-width:288px;width:90%;"><tr><td style="padding:6px 4px;color:#f4f4f8;">
                      ${message}
                    </td></tr></table>
                  </td>
                </tr>
              </table>

              <!-- Pie dibujado en el PNG -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td height="${bottomReservePx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr></table>
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
    '',
    `Ver producto: ${p.ctaUrl}`,
  ].join('\n');

  return { html, text };
}

module.exports = { getGiftReceivedTemplate };

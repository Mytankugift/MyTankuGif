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

  /** Escala vertical aproximada en móvil (clientes con @media). */
  const MOBILE_LAYOUT_SCALE = 0.78;
  const mob = (n) => Math.max(1, Math.round(Number(n) * MOBILE_LAYOUT_SCALE));
  const spacerTopMob = mob(spacerTopPx);
  const spacerMiddleMob = mob(spacerMiddlePx);
  /** Hueco entre CTA y burbuja: en móvil baja el mensaje respecto a la primera card. */
  const spacerMiddleDisplayMob = Math.max(28, spacerMiddleMob + 22);
  const bubbleMinMob = Math.max(72, mob(bubbleMinH));
  const bottomReserveMob = mob(bottomReservePx);
  const avSizeMob = 72;
  const avRadMob = Math.round(avSizeMob / 2);
  const avOverlapMob = Math.max(10, Math.round(avSizeMob * 0.24));
  const avatarClusterOuterWMob = avSizeMob + avSizeMob - avOverlapMob;

  /** Avatars: mayor solapamiento (derecha ~24% del diámetro sobre la izquierda). */
  const avSize = 84;
  const avRad = Math.round(avSize / 2);
  const avOverlapPx = Math.max(14, Math.round(avSize * 0.24));
  const avatarClusterOuterW = avSize + avSize - avOverlapPx;

  const giftEmailEmbeddedCss = `<style type="text/css">
  @media only screen and (max-width:480px){
    body.gift-email-body{padding:8px 0!important;}
    td.gift-shell-pad{padding:0 8px!important;}
    td.gift-card-bg{
      background-size:100% auto!important;
      padding:0 12px!important;
      height:auto!important;
      /* Sin aspect-ratio en muchos lectores → el contenido puede quedar más bajo que el PNG y corta el footer. */
      min-height:${scaledTotalH}px!important;
      aspect-ratio:2901/4482;
    }
    td.gift-spacer-top{height:${spacerTopMob}px!important;}
    td.gift-cluster{
      vertical-align:top!important;
      height:auto!important;
      padding:0 4px!important;
    }
    table.gift-avatars-table{width:${avatarClusterOuterWMob}px!important;}
    img.gift-img-av{width:${avSizeMob}px!important;height:${avSizeMob}px!important;border-radius:${avRadMob}px!important;}
    td.gift-av-gap{width:${avSizeMob - avOverlapMob}px!important;}
    td.gift-av-gap img{margin-left:-${avOverlapMob}px!important;}
    td.gift-cluster .gift-headline{
      margin:10px 4px 0!important;
      font-size:19px!important;
      line-height:1.25!important;
    }
    td.gift-lead-wrap{padding:46px 10px 8px!important;}
    td.gift-lead-wrap .gift-lead-copy{margin:4px 0 11px!important;font-size:15px!important;}
    td.gift-cta-wrap .gift-cta-inner{padding:8px 22px!important;font-size:14px!important;}
    td.gift-spacer-mid{height:${spacerMiddleDisplayMob}px!important;}
    td.gift-bubble-cell{
      height:auto!important;
      min-height:${bubbleMinMob}px!important;
      padding:10px 12px 12px!important;
      font-size:13px!important;
      line-height:1.45!important;
      font-weight:500!important;
    }
    td.gift-bubble-cell .gift-msg-inner{
      font-size:13px!important;
      line-height:1.45!important;
      font-weight:500!important;
      padding:0 4px 6px!important;
    }
    td.gift-bottom-reserve{height:${bottomReserveMob}px!important;}
  }
</style>`;

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${giftEmailEmbeddedCss}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${POPPINS_GOOGLE_STYLESHEET}" rel="stylesheet">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>Un regalo en Tanku</title>
</head>
<body class="gift-email-body" bgcolor="${fallbackBg}" style="margin:0;padding:16px 0;background-color:${fallbackBg};color:#ffffff;font-family:${FONT_STACK};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${fallbackBg}" style="background-color:${fallbackBg};margin:0;">
    <tr>
      <td class="gift-shell-pad" align="center" style="padding:0 12px;">
        <table align="center" width="${MAIL_CARD_W}" cellpadding="0" cellspacing="0" role="presentation"
          style="border-collapse:separate;mso-cellspacing:0;width:100%;max-width:${MAIL_CARD_W}px;background-color:${fallbackBg};">
          <tr>
            <td width="${MAIL_CARD_W}" valign="top" align="center" class="gift-card-bg"
              background="${bgEsc}"
              bgcolor="${fallbackBg}"
              style="
                padding:0 20px;
                vertical-align:top;
                height:${scaledTotalH}px;
                min-height:${scaledTotalH}px;
                background:url('${bgEsc}') center top no-repeat;
                background-size:100% auto;
                background-color:${fallbackBg};
                -webkit-print-color-adjust:exact;
              ">
              <!-- Avatars + titular -->
              <table cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%" style="max-width:${MAIL_CARD_W - 40}px;margin:0 auto;">
                ${spacerTopPx ? `<tr><td class="gift-spacer-top" height="${spacerTopPx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;height:${spacerTopPx}px;">&nbsp;</td></tr>` : ''}
                <tr>
                  <td class="gift-cluster" align="center" valign="middle" height="${clusterDispH}" style="height:${clusterDispH}px;line-height:normal;font-family:${FONT_STACK};">
                    <table class="gift-avatars-table" align="center" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;border-collapse:collapse;width:${avatarClusterOuterW}px;">
                      <tr>
                        <td valign="middle" align="right" width="${avSize}" style="padding:0;line-height:0;">
                          <img class="gift-img-av gift-img-av-l" src="${senderAvatarEscaped}" width="${avSize}" height="${avSize}" alt=""
                            style="display:block;width:${avSize}px;height:${avSize}px;border-radius:${avRad}px;object-fit:cover;border:${AVATAR_BORDER};box-sizing:border-box;${IMG_RENDER}">
                        </td>
                        <td class="gift-av-gap" valign="middle" align="left" width="${avSize - avOverlapPx}" style="padding:0;line-height:0;width:${avSize - avOverlapPx}px;">
                          <img class="gift-img-av gift-img-av-r" src="${recipientAvatarEscaped}" width="${avSize}" height="${avSize}" alt=""
                            style="display:block;margin-left:-${avOverlapPx}px;width:${avSize}px;height:${avSize}px;border-radius:${avRad}px;object-fit:cover;border:${AVATAR_BORDER};box-sizing:border-box;${IMG_RENDER}">
                        </td>
                      </tr>
                    </table>
                    <p class="gift-headline" style="margin:14px 8px 0;color:#ffffff;font-size:24px;line-height:1.28;font-weight:700;text-align:center;letter-spacing:0.02em;">
                      <span style="color:${accentTeal};">¡${senderName}</span>
                      <span style="color:${accentGreen};"> te<br>regaló algo especial!</span>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Primera card: solo texto fijo + CTA dentro del hueco del PNG -->
              <table cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%" style="max-width:${MAIL_CARD_W - 52}px;margin:0 auto;">
                <tr>
                  <td class="gift-lead-wrap" align="center" style="padding:54px 24px 10px;font-family:${FONT_STACK};">
                    <p class="gift-lead-copy" style="margin:0 0 16px;color:#ffffff;font-size:19px;line-height:1.5;font-weight:600;text-align:center;letter-spacing:0.025em;font-style:normal;">
                      No es solo un regalo — es decirte cuánto importas.
                    </p>
                    <table cellpadding="0" cellspacing="0" align="center" role="presentation" style="margin:0 auto;">
                      <tr>
                        <td class="gift-cta-wrap" align="center" bgcolor="${ctaBtnSolid}" style="
                            border-radius:999px;
                            background-color:${ctaBtnSolid};
                            background-image:linear-gradient(90deg,${ctaBtnGradLight} 0%,${ctaBtnGradDark} 100%);
                            box-shadow:inset 0 2px 5px rgba(0,0,0,0.45),inset 0 -2px 4px rgba(0,0,0,0.28);
                          ">
                          <a class="gift-cta-inner" href="${cta}"
                            style="display:inline-block;padding:10px 40px;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:1.15;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.03em;box-shadow:inset 0 2px 4px rgba(0,0,0,0.45),inset 0 -2px 3px rgba(0,0,0,0.25);">
                            Ver producto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${spacerMiddlePx ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td class="gift-spacer-mid" height="${spacerMiddlePx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;height:${spacerMiddlePx}px;">&nbsp;</td></tr></table>` : ''}

              <!-- Mensaje contenido dentro de la burbuja (ancho limitado para no desbordar el arte) -->
              <table cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%"
                style="max-width:${MAIL_CARD_W - 52}px;margin:0 auto;">
                <tr>
                  <td class="gift-bubble-cell" align="center" valign="top" height="${bubbleMinH}"
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
                    <table align="center" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;max-width:288px;width:90%;"><tr><td class="gift-msg-inner" style="padding:6px 4px;color:#f4f4f8;">
                      ${message}
                    </td></tr></table>
                  </td>
                </tr>
              </table>

              <!-- Pie dibujado en el PNG -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td class="gift-bottom-reserve" height="${bottomReservePx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;height:${bottomReservePx}px;">&nbsp;</td></tr></table>
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

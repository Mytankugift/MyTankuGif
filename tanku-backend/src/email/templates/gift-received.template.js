const { escapeHtml } = require('./base.template');

const MAX_MESSAGE_HTML_NEWLINES = 32;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GIFT_QUICK — **Editá solo esto** para el día a día (Tanku correo regalo)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Definís **una vez** tamaños en escritorio; tablet y móvil usan `tabletScale` y `mobileScale`
 * sobre esos valores (avatares, fuentes, paddings del lead y burbuja, etc.).
 *
 * | Querés… | Mové… |
 * |---------|--------|
 * | Área **avatares + «Nombre te regaló…»** más alta | `clusterMinHeightPx` ↑ |
 * | Más espacio entre fotos y titular | `headlineGapBelowAvatarsPx` ↑ |
 * | Fotos más grandes/pequeñas | `avatarDiameterPx` |
 * | **Bajar** «No es solo un regalo» | `leadPaddingTopPx` ↑ |
 * | **Tablet portrait:** bajar un poco ese fijo | `tabletPortraitLeadPadBumpPx` ↑ |
 * | **Tablet portrait:** bajar más el mensaje en burbuja | `tabletPortraitBubblePadTopExtraPx` ↑ |
 * | **Tablet landscape:** subir solo el mensaje en burbuja | `tabletLandscapeBubblePadTopLiftPx` ↑ |
 * | Más/menos hueco **rosa** entre botón y mensaje | `spacerMidAdjustPx` (+ más hueco, − menos) |
 * | Todo tablet más chico manteniendo proporción | `tabletScale` ↓ |
 * | Todo móvil más chico | `mobileScale` ↓ |
 *
 * Los números “raros” del PNG (posiciones Y, recortes Gmail tablet) están en `advanced`.
 * `GIFT_LAYOUT` se **arma solo** con `buildGiftLayoutFromQuick`; no lo edites a mano.
 */
const GIFT_QUICK = {
  /** 481–768px: multiplicador sobre paddings/fuentes escritorio antes del compact final (`tcp`). */
  tabletScale: 0.92,
  /** ≤480px: multiplicador sobre medidas escritorio (`mob`). */
  mobileScale: 0.78,

  /** Diámetro cada avatar en escritorio (px). Tablet ≈ × tabletScale; móvil ≈ × mobileScale. */
  avatarDiameterPx: 84,

  /** Px entre la fila de avatares y el titular «¡X te regaló…». */
  headlineGapBelowAvatarsPx: 14,

  /** Altura mínima de la celda cluster (avatares + titular). Evita que quede aplastado. */
  clusterMinHeightPx: 100,

  /** Padding superior del bloque «No es solo…» + botón (**↑ baja** el texto dentro del hueco PNG). */
  leadPaddingTopPx: 28,
  leadPaddingSidesPx: 22,
  leadPaddingBottomPx: 8,
  /** Espacio debajo del párrafo fijo antes del botón. */
  leadCopyMarginBottomPx: 12,

  headlineFontPx: 24,
  headlineSideMarginPx: 8,
  leadCopyFontPx: 18,
  bubbleFontPx: 13,
  bubblePaddingTopPx: 20,
  bubblePaddingBottomPx: 24,
  ctaPaddingYPx: 8,
  ctaPaddingXPx: 32,
  ctaFontPx: 15,

  msgInnerPaddingTopPx: 2,
  msgInnerPaddingXPx: 4,
  msgInnerPaddingBottomPx: 4,

  /**
   * Ajuste del spacer entre «Ver producto» y la burbuja del mensaje (px escritorio lógicos).
   * **Positivo** = más hueco; **negativo** = menos (sin pasar de 0 tras clamp interno).
   */
  spacerMidAdjustPx: 0,

  /** Tablet portrait: +px al padding-top del lead (empuja «No es solo un regalo…» abajo). Escalado `tcp`. */
  tabletPortraitLeadPadBumpPx: 6,
  /** Tablet portrait: +px al padding-top de la burbuja (mensaje dinámico más abajo que el fijo). Escalado `tcp`. */
  tabletPortraitBubblePadTopExtraPx: 18,
  /** Tablet landscape: −px al padding-top de la burbuja (sube el mensaje). Escalado `tcp`, mínimo 8px efectivo. */
  tabletLandscapeBubblePadTopLiftPx: 12,

  /**
   * Resta px al spacer medio calculado (acerca lead y burbuja en el modelo interno).
   * Preferí `spacerMidAdjustPx` para el hueco rosado; este es legacy fino lead vs burbuja.
   */
  leadTopShiftPx: 0,

  /** Anchos copy/burbuja (compartidos todos los modos). */
  copy: {
    leadMaxWidth: 286,
    bubblePadLeft: 28,
    bubblePadRight: 14,
    bubbleMsgMaxWidth: 248,
  },

  /** Card / PNG maestro. */
  card: {
    bgMasterW: 900,
    bgMasterH: 1200,
    mailW: 480,
  },

  desktopShell: {
    cardPaddingXPx: 20,
    contentStackInnerTrimPx: 40,
    leadBubbleInnerTrimPx: 52,
    headlineLineHeight: 1.28,
    bubbleLineHeight: 1.44,
    bottomReserveMasterPx: 132,
    bottomReserveMinPx: 72,
    mainBlockApproxPx: 128,
    bubbleMinFloor: 92,
    bubbleLayoutTrimPx: 12,
    avOverlapRatio: 0.24,
    avOverlapMin: 14,
  },

  /**
   * Avanzado: alineación al PNG `tanku-email-card.png`, Gmail tablet partido, portrait.
   * Tocá solo si el bloque anterior no alcanza.
   */
  advanced: {
    yAvatarsMaster: 180,
    yMainMaster: 500,
    yBubbleMaster: 790,
    shiftUpMasterPx: 56,
    landscapeExtraShiftMasterPx: 49,
    spacerMidTrimMasterPx: 10,
    portraitLeadPadExtraMasterPx: 8,
    portraitNudgeDownMasterPx: 42,
    landscapeClusterShrinkRatio: 0.85,
    portraitLeadExtraMin: 2,
    landscapeLeadPadClampMin: 12,
    landscapeLeadPadTopRefPx: 18,
    leadPadTopClampMinPx: 14,
    bubbleFontMinPx: 11,
    bubbleMinClampPx: 80,
    headlineFontMinTabletPx: 18,
    leadCopyFontMinTabletPx: 15,
    ctaFontMinTabletPx: 13,
    shiftUpExtraMobilePx: 18,
    contentNudgeDownMobilePx: 12,
    spacerMiddleBonusMobilePx: 4,
    spacerMiddleDisplayMinMobilePx: 10,
    spacerMiddleAdjustedMinMobilePx: 8,
    bubbleMinSubtractMobilePx: 8,
    bodyPaddingVertMobilePx: 8,
    shellPadSideMobilePx: 8,
    cardBgPaddingXMobilePx: 12,
    cardMinHeightExtraMobilePx: 36,
    clusterPaddingSideMobilePx: 4,
    headlineLineHeightMobile: 1.22,
    bubbleLineHeightMobile: 1.4,
    bubbleSidePadRightMinMobile: 10,
    bubbleSidePadLeftMinMobile: 14,
    bubbleMsgShellMaxFloorMobile: 200,
    msgInnerPaddingTopMobilePx: 0,
    leadTextShellMaxWidthMobile: 232,
    leadWrapPadTopMinMobilePx: 10,
    headlineSideMarginMobilePx: 4,
    /** Tablet: cluster landscape ≈ esta fracción del cluster tablet base (px enteros después). */
    landscapeClusterHeightFraction: 0.78,
  },
};

function buildGiftLayoutFromQuick(q) {
  const ts = q.tabletScale;
  const ms = q.mobileScale;
  const adv = q.advanced;
  const ds = q.desktopShell;

  const clusterTabletMin = Math.max(
    72,
    Math.round(q.clusterMinHeightPx * ts)
  );
  const clusterLandscapeMin = Math.max(
    60,
    Math.round(clusterTabletMin * adv.landscapeClusterHeightFraction)
  );

  const avTabletFloor = Math.max(54, Math.round(q.avatarDiameterPx * ts));

  return {
    card: { ...q.card },
    copy: { ...q.copy },
    leadTopShiftPx: q.leadTopShiftPx,
    desktop: {
      yAvatarsMaster: adv.yAvatarsMaster,
      yMainMaster: adv.yMainMaster,
      yBubbleMaster: adv.yBubbleMaster,
      bottomReserveMasterPx: ds.bottomReserveMasterPx,
      bottomReserveMinPx: ds.bottomReserveMinPx,
      mainBlockApproxPx: ds.mainBlockApproxPx,
      clusterMinHeight: q.clusterMinHeightPx,
      bubbleMinFloor: ds.bubbleMinFloor,
      bubbleLayoutTrimPx: ds.bubbleLayoutTrimPx,
      avSize: q.avatarDiameterPx,
      avOverlapRatio: ds.avOverlapRatio,
      avOverlapMin: ds.avOverlapMin,
      leadPaddingTop: q.leadPaddingTopPx,
      leadPaddingSides: q.leadPaddingSidesPx,
      leadPaddingBottom: q.leadPaddingBottomPx,
      headlineMarginTop: q.headlineGapBelowAvatarsPx,
      headlineSideMargin: q.headlineSideMarginPx,
      headlineFontPx: q.headlineFontPx,
      headlineLineHeight: ds.headlineLineHeight,
      leadCopyMarginBottom: q.leadCopyMarginBottomPx,
      leadCopyFontPx: q.leadCopyFontPx,
      bubblePaddingTop: q.bubblePaddingTopPx,
      bubblePaddingBottom: q.bubblePaddingBottomPx,
      bubbleFontPx: q.bubbleFontPx,
      bubbleLineHeight: ds.bubbleLineHeight,
      ctaPaddingY: q.ctaPaddingYPx,
      ctaPaddingX: q.ctaPaddingXPx,
      ctaFontPx: q.ctaFontPx,
      cardPaddingXPx: ds.cardPaddingXPx,
      contentStackInnerTrimPx: ds.contentStackInnerTrimPx,
      leadBubbleInnerTrimPx: ds.leadBubbleInnerTrimPx,
      msgInnerPaddingTop: q.msgInnerPaddingTopPx,
      msgInnerPaddingX: q.msgInnerPaddingXPx,
      msgInnerPaddingBottom: q.msgInnerPaddingBottomPx,
    },
    tablet: {
      compact: ts,
      shiftUpMasterPx: adv.shiftUpMasterPx,
      landscapeExtraShiftMasterPx: adv.landscapeExtraShiftMasterPx,
      spacerMidTrimMasterPx: adv.spacerMidTrimMasterPx,
      portraitLeadPadExtraMasterPx: adv.portraitLeadPadExtraMasterPx,
      portraitNudgeDownMasterPx: adv.portraitNudgeDownMasterPx,
      clusterMinHeight: clusterTabletMin,
      landscapeClusterMinHeight: clusterLandscapeMin,
      landscapeClusterShrinkRatio: adv.landscapeClusterShrinkRatio,
      leadPadTopClampMin: adv.leadPadTopClampMinPx,
      leadPadTopBase: q.leadPaddingTopPx,
      portraitLeadExtraMin: adv.portraitLeadExtraMin,
      landscapeLeadPadClampMin: adv.landscapeLeadPadClampMin,
      landscapeLeadPadTop: adv.landscapeLeadPadTopRefPx,
      bubblePadTopRef: q.bubblePaddingTopPx,
      bubblePadBotRef: q.bubblePaddingBottomPx,
      bubbleFontRef: q.bubbleFontPx,
      bubbleFontMin: adv.bubbleFontMinPx,
      bubbleMinClamp: Math.max(
        68,
        Math.round(adv.bubbleMinClampPx * ts)
      ),
      headlineFontRef: q.headlineFontPx,
      headlineFontMin: Math.min(
        q.headlineFontPx - 1,
        adv.headlineFontMinTabletPx
      ),
      headlineMarginTopRef: q.headlineGapBelowAvatarsPx,
      headlineSideMarginRef: q.headlineSideMarginPx,
      headlineLineHeight: 1.26,
      leadCopyFontRef: q.leadCopyFontPx,
      leadCopyFontMin: adv.leadCopyFontMinTabletPx,
      leadCopyMarginBotRef: q.leadCopyMarginBottomPx,
      leadWrapPadHRef: q.leadPaddingSidesPx,
      leadWrapPadBotRef: q.leadPaddingBottomPx,
      ctaFontRef: q.ctaFontPx,
      ctaFontMin: adv.ctaFontMinTabletPx,
      ctaPadYRef: q.ctaPaddingYPx,
      ctaPadXRef: q.ctaPaddingXPx,
      avMinFromDesktop: avTabletFloor,
    },
    mobile: {
      layoutScale: ms,
      shiftUpExtraPx: adv.shiftUpExtraMobilePx,
      contentNudgeDownPx: adv.contentNudgeDownMobilePx,
      spacerMiddleBonusPx: adv.spacerMiddleBonusMobilePx,
      spacerMiddleDisplayMin: adv.spacerMiddleDisplayMinMobilePx,
      spacerMiddleAdjustedMin: adv.spacerMiddleAdjustedMinMobilePx,
      bubbleMinSubtractPx: adv.bubbleMinSubtractMobilePx,
      avSize: Math.max(52, Math.round(q.avatarDiameterPx * ms)),
      avOverlapRatio: ds.avOverlapRatio,
      avOverlapMin: Math.max(8, Math.round(ds.avOverlapMin * ms)),
      bodyPaddingVertPx: adv.bodyPaddingVertMobilePx,
      shellPadSidePx: adv.shellPadSideMobilePx,
      cardBgPaddingXPx: adv.cardBgPaddingXMobilePx,
      cardMinHeightExtraPx: adv.cardMinHeightExtraMobilePx,
      clusterPaddingSidePx: adv.clusterPaddingSideMobilePx,
      headlineMarginTop: Math.max(
        8,
        Math.round(q.headlineGapBelowAvatarsPx * ms)
      ),
      headlineSideMargin: Math.max(
        4,
        Math.round(adv.headlineSideMarginMobilePx * ms)
      ),
      headlineFontPx: Math.max(
        14,
        Math.round(q.headlineFontPx * ms)
      ),
      headlineLineHeight: adv.headlineLineHeightMobile,
      leadWrapPadTopMin: adv.leadWrapPadTopMinMobilePx,
      leadWrapPadTop: Math.round(q.leadPaddingTopPx * ms),
      leadWrapPadSides: Math.round(q.leadPaddingSidesPx * ms),
      leadWrapPadBottom: Math.round(q.leadPaddingBottomPx * ms),
      leadCopyMarginBot: Math.round(q.leadCopyMarginBottomPx * ms),
      leadCopyFontPx: Math.max(
        13,
        Math.round(q.leadCopyFontPx * ms)
      ),
      leadTextShellMaxWidth: adv.leadTextShellMaxWidthMobile,
      ctaPadY: Math.round(q.ctaPaddingYPx * ms),
      ctaPadX: Math.round(q.ctaPaddingXPx * ms),
      ctaFontPx: Math.max(12, Math.round(q.ctaFontPx * ms)),
      bubblePadTop: Math.round(q.bubblePaddingTopPx * ms),
      bubblePadBottom: Math.round(q.bubblePaddingBottomPx * ms),
      bubbleSidePadRightMin: adv.bubbleSidePadRightMinMobile,
      bubbleSidePadLeftMin: adv.bubbleSidePadLeftMinMobile,
      bubbleFontPx: Math.max(
        adv.bubbleFontMinPx,
        Math.round(q.bubbleFontPx * ms)
      ),
      bubbleLineHeight: adv.bubbleLineHeightMobile,
      bubbleMsgShellMaxFloor: adv.bubbleMsgShellMaxFloorMobile,
      msgInnerPaddingTop: adv.msgInnerPaddingTopMobilePx,
      msgInnerPaddingX: Math.max(
        4,
        Math.round(q.msgInnerPaddingXPx * ms)
      ),
      msgInnerPaddingBottom: Math.max(
        4,
        Math.round(q.msgInnerPaddingBottomPx * ms)
      ),
    },
  };
}

const GIFT_LAYOUT = buildGiftLayoutFromQuick(GIFT_QUICK);

const MAIL_CARD_W = GIFT_LAYOUT.card.mailW;
const BG_MASTER_W = GIFT_LAYOUT.card.bgMasterW;
const BG_MASTER_H = GIFT_LAYOUT.card.bgMasterH;
/** Reexport de `copy.*` para el HTML/CSS (mismo significado que en GIFT_LAYOUT.copy). */
const LEAD_COPY_MAX_WIDTH = GIFT_LAYOUT.copy.leadMaxWidth;
const BUBBLE_MSG_PAD_LEFT = GIFT_LAYOUT.copy.bubblePadLeft;
const BUBBLE_MSG_PAD_RIGHT = GIFT_LAYOUT.copy.bubblePadRight;
const BUBBLE_MSG_MAX_WIDTH = GIFT_LAYOUT.copy.bubbleMsgMaxWidth;

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
 * Plantilla HTML + texto plano del correo «recibiste un regalo».
 *
 * **Parámetros dinámicos:** nombres, avatares, mensaje, URL del CTA y base de assets.
 *
 * **Layout estático:** valores de diseño en {@link GIFT_QUICK}; el objeto {@link GIFT_LAYOUT} se genera con `buildGiftLayoutFromQuick`.
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

  const { desktop: d, tablet: t, mobile: m } = GIFT_LAYOUT;
  const leadTopShiftPx = GIFT_LAYOUT.leadTopShiftPx;
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

  /**
   * Escala entre el PNG maestro (ancho `bgMasterW`) y la card HTML (`mailW`).
   * Todas las Y `desktop.y*Master` se convierten a px con `round(y * scale)`.
   */
  const scale = MAIL_CARD_W / BG_MASTER_W;
  /** Alto total de la imagen de fondo escalada (px). */
  const scaledTotalH = Math.round(BG_MASTER_H * scale);

  /**
   * `tcp(x)` = compactación tablet: redondea `x * tablet.compact` (mínimo 1).
   * Usalo para paddings/fuentes del bloque @media 481–768.
   */
  const tcp = (n) => Math.max(1, Math.round(Number(n) * t.compact));

  /** Píxeles (en card) que el bloque tablet “sube” respecto al desktop: restan al spacer top y al cluster. */
  const tabletShiftDisp = Math.round(t.shiftUpMasterPx * scale);
  /** Igual pero **sólo landscape** tablet: resta encima del spacer ya ajustado por `tabletShiftDisp`. */
  const tabletLandscapeExtraDisp = Math.round(
    t.landscapeExtraShiftMasterPx * scale
  );
  /** Cuántos px (tras × scale) se **recortan** del spacer entre CTA y burbuja en tablet. */
  const tabletSpacerMidTrimDisp = Math.round(t.spacerMidTrimMasterPx * scale);
  /** Extra de padding superior del lead en portrait, en unidades maestro→px card. */
  const tabletPortraitLeadExtraDisp = Math.round(
    t.portraitLeadPadExtraMasterPx * scale
  );
  /** Suma al spacer superior **sólo portrait** tablet para empujar todo el contenido hacia abajo. */
  const tabletPortraitNudgeDown = Math.round(t.portraitNudgeDownMasterPx * scale);

  /** Altura del `<td class="gift-spacer-top">` en escritorio (px): deja hueco hasta los avatares. */
  const spacerTopPx = Math.round(d.yAvatarsMaster * scale);
  /** Posición escalada donde el diseño ubica el inicio del bloque main (lead). */
  const mainStartDisp = Math.round(d.yMainMaster * scale);
  /**
   * Altura de la celda cluster = fila avatares + titular.
   * `max(clusterMinHeight, mainStartDisp - spacerTopPx)` evita celda demasiado baja.
   */
  const clusterDispH = Math.max(d.clusterMinHeight, mainStartDisp - spacerTopPx);

  /** Reserva vertical bajo la burbuja para no invadir el pie del PNG. */
  const bottomReservePx = Math.max(
    d.bottomReserveMinPx,
    Math.round(d.bottomReserveMasterPx * scale)
  );

  const bubbleTopDisp = Math.round(d.yBubbleMaster * scale);
  /**
   * min-height base de la celda burbuja: rellena hasta cerca del borde inferior del área útil del card,
   * restando `bubbleLayoutTrimPx` para no pegar al arte.
   */
  const bubbleMinH = Math.max(
    d.bubbleMinFloor,
    scaledTotalH - bubbleTopDisp - bottomReservePx - d.bubbleLayoutTrimPx
  );

  /**
   * Spacer **teórico** entre el final del cluster+main y el inicio de la burbuja.
   * Depende fuertemente de `mainBlockApproxPx` (altura supuesta del lead+CTA).
   */
  const spacerMiddlePx = Math.max(
    0,
    bubbleTopDisp - spacerTopPx - clusterDispH - d.mainBlockApproxPx
  );

  /** Hueco rosa CTA→burbuja: `spacerMidAdjustPx` en {@link GIFT_QUICK} suma/resta px antes del shift global del lead. */
  const spacerMiddleWithAdjust = Math.max(
    0,
    spacerMiddlePx + GIFT_QUICK.spacerMidAdjustPx
  );
  /** Tras aplicar `leadTopShiftPx` global (reduce el spacer si leadTopShiftPx > 0 según la fórmula). */
  const spacerMiddleAfterLead = Math.max(
    0,
    spacerMiddleWithAdjust - leadTopShiftPx
  );

  /** —— Derivados **tablet** (antes de aplicar `tcp` a algunos resultados) —— */
  const spacerTopTabletRaw = Math.max(0, spacerTopPx - tabletShiftDisp);
  const clusterDispHTabletRaw = Math.max(t.clusterMinHeight, clusterDispH - tabletShiftDisp);
  const spacerTopTabletLandscapeRaw = Math.max(
    0,
    spacerTopTabletRaw - tabletLandscapeExtraDisp
  );
  const clusterDispHTabletLandscapeRaw = Math.max(
    t.landscapeClusterMinHeight,
    clusterDispHTabletRaw -
      Math.round(tabletLandscapeExtraDisp * t.landscapeClusterShrinkRatio)
  );

  const spacerTopTablet = tcp(spacerTopTabletRaw);
  const clusterDispHTablet = tcp(clusterDispHTabletRaw);
  const spacerTopTabletLandscape = tcp(spacerTopTabletLandscapeRaw);
  const clusterDispHTabletLandscape = tcp(clusterDispHTabletLandscapeRaw);

  /** Portrait tablet: spacer tope mayor que en base (empeja avatares más abajo). */
  const spacerTopTabletPortrait = spacerTopTablet + tabletPortraitNudgeDown;

  /** Móvil: spacer top con doble corrección (`shiftUpExtra` baja px, `contentNudgeDown` los suma). */
  const spacerTopPhone = Math.max(
    0,
    spacerTopPx -
      tabletShiftDisp -
      m.shiftUpExtraPx +
      m.contentNudgeDownPx
  );

  /** Escala proporcional móvil para spacers/burbuja derivados del layout desktop. */
  const mob = (n) =>
    Math.max(1, Math.round(Number(n) * m.layoutScale));

  /** Spacer medio escalado solo para la rama móvil (entre CTA y burbuja); usa `spacerMiddleWithAdjust` como en escritorio. */
  const spacerMiddleMob = mob(spacerMiddleWithAdjust);
  /** Garantiza un mínimo visual + bonus configurable (`mobile.spacerMiddleBonusPx`). */
  const spacerMiddleDisplayMob = Math.max(
    m.spacerMiddleDisplayMin,
    spacerMiddleMob + m.spacerMiddleBonusPx
  );
  /** Versión final tras restar `leadTopShiftPx` (coherente con escritorio/tablet). */
  const spacerMiddleDisplayMobAdjusted = Math.max(
    m.spacerMiddleAdjustedMin,
    spacerMiddleDisplayMob - leadTopShiftPx
  );
  /** Altura mínima burbuja en móvil: ni demasiado baja ni ignore el escalado `mob`. */
  const bubbleMinMob = Math.max(
    bubbleMinH - m.bubbleMinSubtractPx,
    mob(bubbleMinH)
  );

  /** —— Avatares y cluster: valores por modo (px finales en CSS @media) —— */
  const avSizeMob = m.avSize;
  const avRadMob = Math.round(avSizeMob / 2);
  const avOverlapMob = Math.max(
    m.avOverlapMin,
    Math.round(avSizeMob * m.avOverlapRatio)
  );
  const avatarClusterOuterWMob = avSizeMob + avSizeMob - avOverlapMob;

  /** Escritorio: tamaño inline en el `<img>` y anchos de `<td>` del par de fotos. */
  const avSize = d.avSize;
  const avRad = Math.round(avSize / 2);
  const avOverlapPx = Math.max(
    d.avOverlapMin,
    Math.round(avSize * d.avOverlapRatio)
  );
  const avatarClusterOuterW = avSize + avSize - avOverlapPx;

  /** Tablet: recalculado con `tcp(d.avSize)` pero nunca por debajo de `avMinFromDesktop`. */
  const avSizeTablet = Math.max(t.avMinFromDesktop, tcp(avSize));
  const avRadTablet = Math.round(avSizeTablet / 2);
  const avOverlapTablet = Math.max(12, Math.round(avSizeTablet * d.avOverlapRatio));
  const avatarClusterOuterWTablet =
    avSizeTablet + avSizeTablet - avOverlapTablet;

  /** Padding superior del `<td>` lead en tablet base / portrait / landscape (ya compactados). */
  const tabletLeadPadTopBase = tcp(
    Math.max(t.leadPadTopClampMin, t.leadPadTopBase + leadTopShiftPx)
  );
  const tabletPortraitLeadPadTop =
    tabletLeadPadTopBase +
    Math.max(t.portraitLeadExtraMin, tcp(tabletPortraitLeadExtraDisp)) +
    tcp(GIFT_QUICK.tabletPortraitLeadPadBumpPx);
  const tabletLandscapeLeadPadTop = tcp(
    Math.max(t.landscapeLeadPadClampMin, t.landscapeLeadPadTop + leadTopShiftPx)
  );

  /** Altura CSS del spacer entre botón y burbuja en tablet (`!important` en @media). */
  const spacerMiddleTablet = tcp(
    Math.max(0, spacerMiddleAfterLead - tabletSpacerMidTrimDisp)
  );

  /** Resto de tokens tablet para el bloque `<style>` (tipografía/padding burbuja/CTA). */
  const bubbleMinTablet = Math.max(t.bubbleMinClamp, tcp(bubbleMinH));
  const bubblePadTopTablet = tcp(t.bubblePadTopRef);
  const bubblePadTopTabletPortrait =
    bubblePadTopTablet + tcp(GIFT_QUICK.tabletPortraitBubblePadTopExtraPx);
  const bubblePadTopTabletLandscape = Math.max(
    8,
    bubblePadTopTablet - tcp(GIFT_QUICK.tabletLandscapeBubblePadTopLiftPx)
  );
  const bubblePadBotTablet = tcp(t.bubblePadBotRef);
  const bubblePadSideLTablet = tcp(BUBBLE_MSG_PAD_LEFT);
  const bubblePadSideRTablet = tcp(BUBBLE_MSG_PAD_RIGHT);
  const bubbleFontTablet = Math.max(t.bubbleFontMin, tcp(t.bubbleFontRef));
  const giftHeadlineTabletPx = Math.max(t.headlineFontMin, tcp(t.headlineFontRef));
  const giftHeadlineMarginTopTablet = tcp(t.headlineMarginTopRef);
  const giftLeadCopyTabletPx = Math.max(t.leadCopyFontMin, tcp(t.leadCopyFontRef));
  const giftLeadCopyMarginBotTablet = tcp(t.leadCopyMarginBotRef);
  const tabletLeadWrapPadHorizontal = tcp(t.leadWrapPadHRef);
  const tabletLeadWrapPadBottom = tcp(t.leadWrapPadBotRef);
  const ctaFontTabletPx = Math.max(t.ctaFontMin, tcp(t.ctaFontRef));
  const ctaPadYTablet = tcp(t.ctaPadYRef);
  const ctaPadXTablet = tcp(t.ctaPadXRef);

  const giftEmailEmbeddedCss = `<style type="text/css">
  @media only screen and (max-width:768px) and (min-width:481px){
    td.gift-spacer-top{height:${spacerTopTablet}px!important;}
    td.gift-cluster{
      height:${clusterDispHTablet}px!important;
      vertical-align:top!important;
    }
    table.gift-avatars-table{width:${avatarClusterOuterWTablet}px!important;}
    table.gift-avatars-table td:first-child{width:${avSizeTablet}px!important;}
    img.gift-img-av{width:${avSizeTablet}px!important;height:${avSizeTablet}px!important;border-radius:${avRadTablet}px!important;}
    td.gift-av-gap{width:${avSizeTablet - avOverlapTablet}px!important;}
    td.gift-av-gap img{margin-left:-${avOverlapTablet}px!important;}
    td.gift-cluster .gift-headline{
      margin:${giftHeadlineMarginTopTablet}px ${tcp(t.headlineSideMarginRef)}px 0!important;
      font-size:${giftHeadlineTabletPx}px!important;
      line-height:${t.headlineLineHeight}!important;
    }
    td.gift-spacer-mid{height:${spacerMiddleTablet}px!important;}
    td.gift-bubble-cell{
      padding:${bubblePadTopTablet}px ${bubblePadSideRTablet}px ${bubblePadBotTablet}px ${bubblePadSideLTablet}px!important;
      min-height:${bubbleMinTablet}px!important;
      font-size:${bubbleFontTablet}px!important;
    }
    td.gift-bubble-cell .gift-msg-inner{font-size:${bubbleFontTablet}px!important;}
    td.gift-lead-wrap{padding:${tabletLeadPadTopBase}px ${tabletLeadWrapPadHorizontal}px ${tabletLeadWrapPadBottom}px!important;}
    td.gift-lead-wrap .gift-lead-copy{
      margin:0 0 ${giftLeadCopyMarginBotTablet}px!important;
      font-size:${giftLeadCopyTabletPx}px!important;
    }
    td.gift-cta-wrap{
      border-radius:999px!important;
      background-color:${ctaBtnSolid}!important;
      background-image:linear-gradient(90deg,${ctaBtnGradLight} 0%,${ctaBtnGradDark} 100%)!important;
      box-shadow:inset 0 2px 5px rgba(0,0,0,0.45),inset 0 -2px 4px rgba(0,0,0,0.28)!important;
    }
    td.gift-cta-wrap .gift-cta-inner{
      display:inline-block!important;
      padding:${ctaPadYTablet}px ${ctaPadXTablet}px!important;
      font-family:${FONT_STACK}!important;
      font-size:${ctaFontTabletPx}px!important;
      font-weight:700!important;
      line-height:1.15!important;
      color:#ffffff!important;
      text-decoration:none!important;
      border-radius:999px!important;
      letter-spacing:0.03em!important;
      box-shadow:inset 0 2px 4px rgba(0,0,0,0.45),inset 0 -2px 3px rgba(0,0,0,0.25)!important;
    }
  }
  @media only screen and (max-width:768px) and (min-width:481px) and (orientation:portrait){
    td.gift-spacer-top{height:${spacerTopTabletPortrait}px!important;}
    td.gift-lead-wrap{padding:${tabletPortraitLeadPadTop}px ${tabletLeadWrapPadHorizontal}px ${tabletLeadWrapPadBottom}px!important;}
    td.gift-bubble-cell{
      padding:${bubblePadTopTabletPortrait}px ${bubblePadSideRTablet}px ${bubblePadBotTablet}px ${bubblePadSideLTablet}px!important;
    }
  }
  @media only screen and (max-width:768px) and (min-width:481px) and (orientation:landscape){
    td.gift-spacer-top{height:${spacerTopTabletLandscape}px!important;}
    td.gift-cluster{
      height:${clusterDispHTabletLandscape}px!important;
      vertical-align:top!important;
    }
    td.gift-lead-wrap{padding:${tabletLandscapeLeadPadTop}px ${tabletLeadWrapPadHorizontal}px ${tabletLeadWrapPadBottom}px!important;}
    td.gift-bubble-cell{
      padding:${bubblePadTopTabletLandscape}px ${bubblePadSideRTablet}px ${bubblePadBotTablet}px ${bubblePadSideLTablet}px!important;
    }
    td.gift-cta-wrap{
      border-radius:999px!important;
      background-color:${ctaBtnSolid}!important;
      background-image:linear-gradient(90deg,${ctaBtnGradLight} 0%,${ctaBtnGradDark} 100%)!important;
      box-shadow:inset 0 2px 5px rgba(0,0,0,0.45),inset 0 -2px 4px rgba(0,0,0,0.28)!important;
    }
    td.gift-cta-wrap .gift-cta-inner{
      display:inline-block!important;
      padding:${ctaPadYTablet}px ${ctaPadXTablet}px!important;
      font-family:${FONT_STACK}!important;
      font-size:${ctaFontTabletPx}px!important;
      font-weight:700!important;
      line-height:1.15!important;
      color:#ffffff!important;
      text-decoration:none!important;
      border-radius:999px!important;
      letter-spacing:0.03em!important;
      box-shadow:inset 0 2px 4px rgba(0,0,0,0.45),inset 0 -2px 3px rgba(0,0,0,0.25)!important;
    }
  }
  @media only screen and (max-width:480px){
    body.gift-email-body{padding:${m.bodyPaddingVertPx}px 0!important;}
    td.gift-shell-pad{padding:0 ${m.shellPadSidePx}px!important;}
    td.gift-card-bg{
      background-size:100% auto!important;
      padding:0 ${m.cardBgPaddingXPx}px!important;
      height:auto!important;
      /* Pie del PNG: altura completa del maestro escalado + margen (evita corte inferior). */
      min-height:${scaledTotalH + m.cardMinHeightExtraPx}px!important;
      aspect-ratio:${BG_MASTER_W}/${BG_MASTER_H};
    }
    td.gift-spacer-top{height:${spacerTopPhone}px!important;}
    td.gift-cluster{
      vertical-align:top!important;
      height:auto!important;
      padding:0 ${m.clusterPaddingSidePx}px!important;
    }
    table.gift-avatars-table{width:${avatarClusterOuterWMob}px!important;}
    img.gift-img-av{width:${avSizeMob}px!important;height:${avSizeMob}px!important;border-radius:${avRadMob}px!important;}
    td.gift-av-gap{width:${avSizeMob - avOverlapMob}px!important;}
    td.gift-av-gap img{margin-left:-${avOverlapMob}px!important;}
    td.gift-cluster .gift-headline{
      margin:${m.headlineMarginTop}px ${m.headlineSideMargin}px 0!important;
      font-size:${m.headlineFontPx}px!important;
      line-height:${m.headlineLineHeight}!important;
    }
    td.gift-lead-wrap{padding:${Math.max(m.leadWrapPadTopMin, m.leadWrapPadTop + leadTopShiftPx)}px ${m.leadWrapPadSides}px ${m.leadWrapPadBottom}px!important;}
    table.gift-lead-text-shell{max-width:${m.leadTextShellMaxWidth}px!important;width:90%!important;}
    td.gift-lead-wrap .gift-lead-copy{margin:0 0 ${m.leadCopyMarginBot}px!important;font-size:${m.leadCopyFontPx}px!important;}
    td.gift-cta-wrap{
      border-radius:999px!important;
      background-color:${ctaBtnSolid}!important;
      background-image:linear-gradient(90deg,${ctaBtnGradLight} 0%,${ctaBtnGradDark} 100%)!important;
      box-shadow:inset 0 2px 5px rgba(0,0,0,0.45),inset 0 -2px 4px rgba(0,0,0,0.28)!important;
    }
    td.gift-cta-wrap .gift-cta-inner{
      display:inline-block!important;
      padding:${m.ctaPadY}px ${m.ctaPadX}px!important;
      font-family:${FONT_STACK}!important;
      font-size:${m.ctaFontPx}px!important;
      font-weight:700!important;
      line-height:1.15!important;
      color:#ffffff!important;
      text-decoration:none!important;
      border-radius:999px!important;
      letter-spacing:0.03em!important;
      box-shadow:inset 0 2px 4px rgba(0,0,0,0.45),inset 0 -2px 3px rgba(0,0,0,0.25)!important;
    }
    td.gift-spacer-mid{height:${spacerMiddleDisplayMobAdjusted}px!important;}
    td.gift-bubble-cell{
      height:auto!important;
      min-height:${bubbleMinMob}px!important;
      padding:${m.bubblePadTop}px ${Math.max(m.bubbleSidePadRightMin, mob(BUBBLE_MSG_PAD_RIGHT))}px ${m.bubblePadBottom}px ${Math.max(m.bubbleSidePadLeftMin, mob(BUBBLE_MSG_PAD_LEFT))}px!important;
      font-size:${m.bubbleFontPx}px!important;
      line-height:${m.bubbleLineHeight}!important;
      font-weight:500!important;
      text-align:center!important;
    }
    table.gift-msg-shell{margin-left:auto!important;margin-right:auto!important;text-align:center!important;max-width:${Math.max(m.bubbleMsgShellMaxFloor, Math.round(BUBBLE_MSG_MAX_WIDTH * m.layoutScale))}px!important;width:84%!important;}
    td.gift-bubble-cell .gift-msg-inner{
      font-size:${m.bubbleFontPx}px!important;
      line-height:${m.bubbleLineHeight}!important;
      font-weight:500!important;
      padding:${m.msgInnerPaddingTop}px ${m.msgInnerPaddingX}px ${m.msgInnerPaddingBottom}px!important;
      text-align:center!important;
    }
    td.gift-bottom-reserve{height:${bottomReservePx}px!important;}
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
                padding:0 ${d.cardPaddingXPx}px;
                vertical-align:top;
                height:${scaledTotalH}px;
                min-height:${scaledTotalH}px;
                background:url('${bgEsc}') center top no-repeat;
                background-size:100% auto;
                background-color:${fallbackBg};
                -webkit-print-color-adjust:exact;
              ">
              <!-- Avatars + titular -->
              <table class="gift-content-stack" cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%" style="max-width:${MAIL_CARD_W - d.contentStackInnerTrimPx}px;margin:0 auto;">
                ${spacerTopPx ? `<tr><td class="gift-spacer-top" height="${spacerTopPx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;height:${spacerTopPx}px;">&nbsp;</td></tr>` : ''}
                <tr>
                  <td class="gift-cluster" align="center" valign="top" height="${clusterDispH}" style="height:${clusterDispH}px;line-height:normal;font-family:${FONT_STACK};">
                    <table class="gift-avatars-table" align="center" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;border-collapse:collapse;width:${avatarClusterOuterW}px;">
                      <tr>
                        <td class="gift-av-cell gift-av-cell-l" valign="middle" align="right" width="${avSize}" style="padding:0;line-height:0;">
                          <img class="gift-img-av gift-img-av-l" src="${senderAvatarEscaped}" width="${avSize}" height="${avSize}" alt=""
                            style="display:block;width:${avSize}px;height:${avSize}px;border-radius:${avRad}px;object-fit:cover;border:${AVATAR_BORDER};box-sizing:border-box;${IMG_RENDER}">
                        </td>
                        <td class="gift-av-gap" valign="middle" align="left" width="${avSize - avOverlapPx}" style="padding:0;line-height:0;width:${avSize - avOverlapPx}px;">
                          <img class="gift-img-av gift-img-av-r" src="${recipientAvatarEscaped}" width="${avSize}" height="${avSize}" alt=""
                            style="display:block;margin-left:-${avOverlapPx}px;width:${avSize}px;height:${avSize}px;border-radius:${avRad}px;object-fit:cover;border:${AVATAR_BORDER};box-sizing:border-box;${IMG_RENDER}">
                        </td>
                      </tr>
                    </table>
                    <p class="gift-headline" style="margin:${d.headlineMarginTop}px ${d.headlineSideMargin}px 0;color:#ffffff;font-size:${d.headlineFontPx}px;line-height:${d.headlineLineHeight};font-weight:700;text-align:center;letter-spacing:0.02em;">
                      <span style="color:${accentTeal};">¡${senderName}</span>
                      <span style="color:${accentGreen};"> te<br>regaló algo especial!</span>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Primera card: solo texto fijo + CTA dentro del hueco del PNG -->
              <table class="gift-lead-stack" cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%" style="max-width:${MAIL_CARD_W - d.leadBubbleInnerTrimPx}px;margin:0 auto;">
                <tr>
                  <td class="gift-lead-wrap" align="center" style="padding:${d.leadPaddingTop + leadTopShiftPx}px ${d.leadPaddingSides}px ${d.leadPaddingBottom}px;font-family:${FONT_STACK};">
                    <table class="gift-lead-text-shell" cellpadding="0" cellspacing="0" align="center" role="presentation" style="margin:0 auto;max-width:${LEAD_COPY_MAX_WIDTH}px;width:92%;border-collapse:collapse;">
                      <tr>
                        <td class="gift-lead-copy-cell" align="center" style="padding:0;">
                          <p class="gift-lead-copy" style="margin:0 0 ${d.leadCopyMarginBottom}px;color:#ffffff;font-size:${d.leadCopyFontPx}px;line-height:1.4;font-weight:600;text-align:center;letter-spacing:0.022em;font-style:normal;">
                            No es solo un regalo, es decirte cuánto importas.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <table class="gift-cta-stack-table" cellpadding="0" cellspacing="0" align="center" role="presentation" style="margin:0 auto;">
                      <tr>
                        <td class="gift-cta-wrap" align="center" bgcolor="${ctaBtnSolid}" style="
                            border-radius:999px;
                            background-color:${ctaBtnSolid};
                            background-image:linear-gradient(90deg,${ctaBtnGradLight} 0%,${ctaBtnGradDark} 100%);
                            box-shadow:inset 0 2px 5px rgba(0,0,0,0.45),inset 0 -2px 4px rgba(0,0,0,0.28);
                          ">
                          <a class="gift-cta-inner" href="${cta}"
                            style="display:inline-block;padding:${d.ctaPaddingY}px ${d.ctaPaddingX}px;font-family:${FONT_STACK};font-size:${d.ctaFontPx}px;font-weight:700;line-height:1.15;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.03em;box-shadow:inset 0 2px 4px rgba(0,0,0,0.45),inset 0 -2px 3px rgba(0,0,0,0.25);">
                            Ver producto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${spacerMiddleAfterLead ? `<table class="gift-spacer-mid-table" width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td class="gift-spacer-mid" height="${spacerMiddleAfterLead}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;height:${spacerMiddleAfterLead}px;">&nbsp;</td></tr></table>` : ''}

              <!-- Mensaje contenido dentro de la burbuja (ancho limitado para no desbordar el arte) -->
              <table class="gift-bubble-stack" cellpadding="0" cellspacing="0" align="center" role="presentation" width="100%"
                style="max-width:${MAIL_CARD_W - d.leadBubbleInnerTrimPx}px;margin:0 auto;">
                <tr>
                  <td class="gift-bubble-cell" align="center" valign="top" height="${bubbleMinH}"
                    style="
                      min-height:${bubbleMinH}px;
                      vertical-align:top;
                      padding:${d.bubblePaddingTop}px ${BUBBLE_MSG_PAD_RIGHT}px ${d.bubblePaddingBottom}px ${BUBBLE_MSG_PAD_LEFT}px;
                      font-family:${FONT_STACK};
                      font-size:${d.bubbleFontPx}px;
                      line-height:${d.bubbleLineHeight};
                      color:#fdfcff;
                      text-align:center;
                      letter-spacing:0.018em;
                      font-weight:500;
                    ">
                    <table class="gift-msg-shell" align="center" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;max-width:${BUBBLE_MSG_MAX_WIDTH}px;width:84%;border-collapse:collapse;text-align:center;"><tr><td class="gift-msg-inner" style="padding:${d.msgInnerPaddingTop}px ${d.msgInnerPaddingX}px ${d.msgInnerPaddingBottom}px;color:#f4f4f8;text-align:center;">
                      ${message}
                    </td></tr></table>
                  </td>
                </tr>
              </table>

              <!-- Pie dibujado en el PNG -->
              <table class="gift-footer-table" width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td class="gift-bottom-reserve" height="${bottomReservePx}" style="font-size:0;line-height:0;mso-line-height-rule:exactly;height:${bottomReservePx}px;">&nbsp;</td></tr></table>
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

/**
 * `getGiftReceivedTemplate`: uso normal desde Nest/mailer.
 * `GIFT_QUICK`: knobs de diseño (editar aquí).
 * `GIFT_LAYOUT`: layout derivado (lectura / tests / tooling).
 */
module.exports = { getGiftReceivedTemplate, GIFT_QUICK, GIFT_LAYOUT };

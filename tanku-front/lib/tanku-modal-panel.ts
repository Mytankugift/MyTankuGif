/**
 * Estilo de modales de perfil (pedido, reportar problema, configuración).
 * @see components/profile/profile-tablet-overlay-modal.tsx
 */
export const TANKU_PROFILE_OVERLAY_PANEL_BG = '#171B21'
export const TANKU_PROFILE_OVERLAY_BORDER = '#414141'

/** Fondo borroso fuera del panel */
export const tankuProfileOverlayBackdropClass =
  'bg-black/10 backdrop-blur-[6px] md:bg-black/15 md:backdrop-blur-sm'

export const tankuProfileOverlayPanelClass =
  'border border-[#414141] bg-[#171B21] shadow-2xl'

/** Bloques internos (tarjetas dentro del modal) */
export const tankuProfileOverlaySectionClass =
  'rounded-lg border border-[#414141]/90 bg-black/20'

/** Secciones del tab Perfil en configuración: ancho completo en desktop, contenido en móvil */
export const tankuSettingsSectionShellClass =
  'w-full max-w-md mx-auto space-y-2.5 rounded-lg border border-[#414141]/90 bg-black/20 p-3 sm:p-3.5 md:mx-0 md:max-w-none'

/** Fila / píldora de valor (información personal, redes, etc.) */
export const tankuSettingsPillClass =
  'flex min-h-9 w-full min-w-0 items-center gap-2 rounded-[20px] border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white'

export const tankuSettingsFieldCardClass =
  'rounded-[20px] border border-[#414141]/70 bg-black/25 px-2.5 py-1.5'

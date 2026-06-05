import type { CSSProperties } from 'react'

/** Radio exterior alineado con ProductModal */
export const TANKU_CARD_SHELL_RADIUS_PX = 25

export const tankuCardShellStyle: CSSProperties = {
  borderRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px`,
}

export const tankuMediaTopRadiusStyle: CSSProperties = {
  borderTopLeftRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px`,
  borderTopRightRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px`,
}

export const tankuMediaFullRadiusStyle: CSSProperties = {
  borderRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px`,
}

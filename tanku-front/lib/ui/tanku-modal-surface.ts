/** Panel de modales alineado con pedidos / soporte (`ProfileTabletOverlayModal`). */
export const tankuOrderModalPanelClass =
  'border border-[#414141] bg-[#171B21] shadow-2xl rounded-2xl md:rounded-[25px]'

export const tankuOrderModalBackdropClass =
  'bg-black/10 backdrop-blur-[6px] md:bg-black/15 md:backdrop-blur-sm'

export const tankuOrderModalInputClass =
  'w-full rounded-xl border border-[#414141] bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#66DEDB]/50 focus:outline-none'

export const tankuOrderModalDropzoneClass =
  'flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#414141] bg-black/25 transition-colors hover:border-[#66DEDB]/40 aspect-[9/16] max-h-[min(50vh,26rem)]'

export const tankuVerticalModalPanelClass = 'tanku-vertical-modal-panel'

/** Bottom nav móvil ≈ 999999; modal post/producto 1000003 */
export const TANKU_POSTER_MODAL_Z = 1_000_003
/** Sheet de comentarios en móvil — debe quedar sobre el modal de publicación */
export const TANKU_POSTER_COMMENTS_SHEET_Z = TANKU_POSTER_MODAL_Z + 1

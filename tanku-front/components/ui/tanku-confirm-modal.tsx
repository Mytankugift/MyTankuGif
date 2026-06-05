'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { TankuDialogOverlay } from '@/components/ui/tanku-dialog-overlay'

const panelSurfaceClass = 'max-w-md overflow-hidden rounded-[24px] border border-[#414141] bg-[#171B21] p-4 sm:p-5'
const actionButtonClass =
  'rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export type TankuConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Botón de confirmación en rojo (eliminar, etc.) */
  variant?: 'danger' | 'default'
  isLoading?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  zIndexClass?: string
}

export function TankuConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  isLoading = false,
  onCancel,
  onConfirm,
  zIndexClass = 'z-[1000003]',
}: TankuConfirmModalProps) {
  return (
    <TankuDialogOverlay
      open={open}
      onClose={onCancel}
      dismissible={!isLoading}
      zIndexClass={zIndexClass}
      panelClassName={panelSurfaceClass}
    >
      <div className="w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#66DEDB] sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="mb-5 text-sm leading-relaxed text-gray-300">{message}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={clsx(
              actionButtonClass,
              'w-full border border-white/15 bg-transparent text-gray-200 hover:bg-white/[0.06] sm:w-auto',
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className={clsx(
              actionButtonClass,
              'flex w-full items-center justify-center gap-2 sm:w-auto',
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-[#73FFA2] text-[#262626] hover:bg-[#66e891]',
            )}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Procesando…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </TankuDialogOverlay>
  )
}

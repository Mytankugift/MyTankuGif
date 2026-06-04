'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'

export interface ProfileTabletOverlayModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  titleId?: string
  panelClassName?: string
  /** Si false, el backdrop no cierra (p. ej. envío en curso). */
  dismissible?: boolean
  /** Ancho máximo de la tarjeta en md+ (centrada). */
  maxWidthClass?: string
  /** Altura en md+; por defecto igual que modal de configuración. */
  panelHeightClass?: string
  /**
   * Móvil: `sheet` = panel entre barras (pantalla); `dialog` = tarjeta centrada como desktop.
   */
  mobileLayout?: 'sheet' | 'dialog'
  /** Fondo fuera del panel en layout `dialog` (y en md+ si se usa blur). */
  mobileBackdrop?: 'none' | 'blur'
}

/**
 * Portal + flex centrado en md+ (como Settings).
 * iPad grande en portrait (1024×1366): `lg:portrait` ancla más arriba (Safari centra en viewport alto).
 */
export function ProfileTabletOverlayModal({
  open,
  onClose,
  children,
  titleId,
  panelClassName,
  dismissible = true,
  maxWidthClass = 'md:max-w-2xl',
  panelHeightClass = 'md:h-[min(44rem,min(92dvh,90vh))] md:min-h-[20rem]',
  mobileLayout = 'sheet',
  mobileBackdrop = 'none',
}: ProfileTabletOverlayModalProps) {
  const mobileDialog = mobileLayout === 'dialog'
  const backdropBlur = mobileBackdrop === 'blur'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className={clsx(
        'pointer-events-none flex',
        mobileDialog
          ? [
              'max-md:fixed max-md:inset-0 max-md:z-[2000000]',
              'max-md:items-center max-md:justify-center',
              'max-md:p-4 max-md:pt-[max(1rem,env(safe-area-inset-top,0px))]',
              'max-md:pb-[max(1rem,env(safe-area-inset-bottom,0px))]',
            ]
          : [
              'max-md:fixed max-md:left-0 max-md:right-0 max-md:top-0 max-md:z-[2000000]',
              'max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
              'max-md:flex-col max-md:items-stretch max-md:justify-stretch max-md:p-0',
              'max-md:pt-[env(safe-area-inset-top,0px)]',
            ],
        'md:fixed md:inset-0 md:z-[2000000] md:flex md:h-[100dvh] md:max-h-[100dvh] md:items-center md:justify-center md:p-6',
        'lg:portrait:items-start lg:portrait:justify-center lg:portrait:pt-[clamp(3.5rem,11vh,6.5rem)] lg:portrait:pb-6',
        'lg:landscape:items-center lg:landscape:pt-0 lg:landscape:pb-0',
      )}
      role="presentation"
    >
      <div
        role="button"
        tabIndex={dismissible ? 0 : -1}
        aria-label="Cerrar"
        className={clsx(
          'pointer-events-auto absolute inset-0 z-0 cursor-default touch-manipulation',
          backdropBlur
            ? 'bg-black/10 backdrop-blur-[6px] md:bg-black/15 md:backdrop-blur-sm'
            : 'bg-transparent'
        )}
        onClick={dismissible ? onClose : undefined}
        onKeyDown={
          dismissible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClose()
                }
              }
            : undefined
        }
      />
      <div
        className={clsx(
          'pointer-events-auto relative z-10 flex w-full min-h-0 flex-1 flex-col overflow-hidden',
          'border border-[#414141] bg-[#171B21] shadow-2xl',
          'min-h-[16rem]',
          mobileDialog
            ? 'max-md:flex-none max-md:min-h-0 max-md:rounded-2xl'
            : 'max-md:max-h-none max-md:min-h-0 max-md:flex-1 max-md:rounded-none max-md:border-x-0 max-md:border-t-0',
          'md:flex-none md:rounded-[25px]',
          maxWidthClass,
          panelHeightClass,
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        {...(titleId ? { 'aria-labelledby': titleId } : {})}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

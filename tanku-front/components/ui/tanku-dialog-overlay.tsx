'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'

/** Fondo borroso estándar Tanku (modales centrados). */
export const tankuDialogBackdropClass =
  'bg-black/10 backdrop-blur-[6px] md:bg-black/15 md:backdrop-blur-sm'

interface TankuDialogOverlayProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Clases del contenedor del panel (ancho, etc.). */
  panelClassName?: string
  zIndexClass?: string
  dismissible?: boolean
}

export function TankuDialogOverlay({
  open,
  onClose,
  children,
  panelClassName,
  zIndexClass = 'z-[1000000]',
  dismissible = true,
}: TankuDialogOverlayProps) {
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
        'fixed inset-0 flex items-center justify-center p-3 sm:p-4',
        zIndexClass
      )}
      role="presentation"
    >
      <div
        role="button"
        tabIndex={dismissible ? 0 : -1}
        aria-label="Cerrar"
        className={clsx('absolute inset-0 touch-manipulation', tankuDialogBackdropClass)}
        onClick={
          dismissible
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }
            : undefined
        }
        onMouseDown={
          dismissible
            ? (e) => {
                e.stopPropagation()
              }
            : undefined
        }
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
        className={clsx('relative z-10 w-full max-h-[min(46rem,93dvh)]', panelClassName)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

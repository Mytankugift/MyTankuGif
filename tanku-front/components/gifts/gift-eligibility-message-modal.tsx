'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface GiftEligibilityMessageModalProps {
  open: boolean
  message: string
  onClose: () => void
  /** Título corto encima del mensaje del backend */
  title?: string
}

export function GiftEligibilityMessageModal({
  open,
  message,
  onClose,
  title = 'Regalo no disponible',
}: GiftEligibilityMessageModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted || !open || !message.trim()) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000005] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-eligibility-msg-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] px-5 py-5 shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="gift-eligibility-msg-title" className="mb-3 text-lg font-semibold text-white">
          {title}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-zinc-300">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-[#73FFA2] py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-[#66e891]"
        >
          Entendido
        </button>
      </div>
    </div>,
    document.body,
  )
}

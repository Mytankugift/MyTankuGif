'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import { SocialLinksSection } from '@/components/profile/settings/social-links-section'

type ProfileSocialExpandPanelProps = {
  open: boolean
  onClose: () => void
  onUpdated?: () => void
}

export function ProfileSocialExpandPanel({
  open,
  onClose,
  onUpdated,
}: ProfileSocialExpandPanelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted || !open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-social-modal-title"
        className="relative flex max-h-[min(560px,calc(100vh-48px))] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[#414141] shadow-2xl"
        style={{ backgroundColor: '#171B21' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b p-4" style={NOTIFICATION_ROW_DIVIDER_STYLE}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <LinkIcon className="h-7 w-7 shrink-0 text-[#73FFA2]" aria-hidden />
              <h4
                id="profile-social-modal-title"
                className="truncate text-base font-semibold text-white"
              >
                Redes sociales
              </h4>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <SocialLinksSection embedded onUpdate={onUpdated} />
        </div>
      </div>
    </div>,
    document.body
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import type { SupportCaseAttachmentDTO } from '@/types/api'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'

/** Por encima de ProfileTabletOverlayModal (z-[2000000]). */
const EVIDENCE_MODAL_Z = 'z-[2000010]'

interface SupportCaseEvidenceModalProps {
  open: boolean
  attachments: SupportCaseAttachmentDTO[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

function isVideoMime(mime: string) {
  return mime.startsWith('video/')
}

export function SupportCaseEvidenceModal({
  open,
  attachments,
  index,
  onClose,
  onIndexChange,
}: SupportCaseEvidenceModalProps) {
  const [mounted, setMounted] = useState(false)
  const file = attachments[index]

  useEffect(() => {
    setMounted(true)
  }, [])

  const goPrev = useCallback(() => {
    if (attachments.length <= 1) return
    onIndexChange((index - 1 + attachments.length) % attachments.length)
  }, [attachments.length, index, onIndexChange])

  const goNext = useCallback(() => {
    if (attachments.length <= 1) return
    onIndexChange((index + 1) % attachments.length)
  }, [attachments.length, index, onIndexChange])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, goPrev, goNext])

  if (!open || !file || !mounted) return null

  return createPortal(
    <div
      className={`fixed inset-0 ${EVIDENCE_MODAL_Z} flex items-center justify-center bg-black/85 p-4`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#414141] bg-[#1a1a1a]"
        style={NOTIFICATION_ROW_DIVIDER_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#414141] px-4 py-3">
          <p className="min-w-0 truncate text-sm text-white">{file.fileName}</p>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-y-auto overscroll-contain p-4">
          {attachments.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 z-10 rounded-full bg-black/60 p-2 text-white"
                aria-label="Anterior"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 z-10 rounded-full bg-black/60 p-2 text-white"
                aria-label="Siguiente"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          ) : null}
          {isImageMime(file.mimeType) ? (
            <div className="relative h-[min(60vh,24rem)] w-full">
              <Image src={file.url} alt={file.fileName} fill className="object-contain" unoptimized />
            </div>
          ) : isVideoMime(file.mimeType) ? (
            <video
              src={file.url}
              controls
              playsInline
              className="max-h-[60vh] w-full rounded bg-black"
            />
          ) : (
            <iframe src={file.url} title={file.fileName} className="h-[50vh] w-full rounded bg-white" />
          )}
        </div>
        {attachments.length > 1 ? (
          <p className="border-t border-[#414141] py-2 text-center text-xs text-gray-500">
            {index + 1} / {attachments.length}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
